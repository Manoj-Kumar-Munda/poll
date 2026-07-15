class ApiResponse<T = null> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T;
  public readonly errors?: unknown[];

  constructor({
    statusCode,
    message = "Success",
    data,
    errors,
  }: {
    statusCode: number;
    message?: string;
    data: T;
    errors?: unknown[];
  }) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
    if (errors && errors.length > 0) {
      this.errors = errors;
    }
  }
}

export { ApiResponse };
