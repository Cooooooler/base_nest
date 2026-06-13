import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockRegister = jest.fn();
  const mockLogin = jest.fn();
  const mockRefresh = jest.fn();
  const mockLogout = jest.fn();

  const mockAuthService = {
    register: mockRegister,
    login: mockLogin,
    refresh: mockRefresh,
    logout: mockLogout,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { email: 'test@test.com', name: 'Test', password: '123456' };
      await controller.register(dto);
      expect(mockRegister).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'test@test.com', password: '123456' };
      await controller.login(dto);
      expect(mockLogin).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      await controller.refresh('some-refresh-token');
      expect(mockRefresh).toHaveBeenCalledWith('some-refresh-token');
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      await controller.logout('Bearer access-token', 'refresh-token');
      expect(mockLogout).toHaveBeenCalledWith('access-token', 'refresh-token');
    });
  });
});
