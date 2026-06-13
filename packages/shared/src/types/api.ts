export interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  msg: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
