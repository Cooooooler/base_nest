import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
  });

  const createMockHost = (url = '/test', method = 'GET') => {
    const jsonFn = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusFn }),
        getRequest: () => ({ url, method }),
      }),
    };
  };

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should format HttpException response', () => {
    const host = createMockHost();
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    const response = host.switchToHttp().getResponse();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const jsonFn = response.status.mock.results[0].value.json;
    expect(jsonFn).toHaveBeenCalledWith({
      code: 0,
      data: null,
      msg: 'Not Found',
    });
  });

  it('should return 500 for non-HttpException errors', () => {
    const host = createMockHost();

    filter.catch(new Error('Unexpected error'), host);

    const response = host.switchToHttp().getResponse();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const jsonFn = response.status.mock.results[0].value.json;
    expect(jsonFn).toHaveBeenCalledWith({
      code: 0,
      data: null,
      msg: 'Internal server error',
    });
  });

  it('should log errors with status 500', () => {
    const host = createMockHost('/api/test', 'POST');
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');

    filter.catch(new Error('DB connection failed'), host);

    expect(loggerSpy).toHaveBeenCalledWith('POST /api/test', expect.any(String));
  });

  it('should not log non-500 errors', () => {
    const host = createMockHost();
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');
    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
