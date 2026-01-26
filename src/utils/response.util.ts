export const createResponse = (success: boolean, data: any, message?: string) => ({
  success,
  data,
  message: message || null,
});