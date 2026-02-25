export async function onRequest(context) {
  const { request, next } = context;
  
  // 设置用户名和密码
  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'cirm2026';
  
  // 获取认证头
  const auth = request.headers.get('Authorization');
  
  // 如果没有认证头，要求登录
  if (!auth) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"'
      }
    });
  }
  
  // 解析认证信息
  const [scheme, encoded] = auth.split(' ');
  if (!encoded || scheme !== 'Basic') {
    return new Response('Invalid authentication', { status: 401 });
  }
  
  // Base64 解码
  const decoded = atob(encoded);
  const [username, password] = decoded.split(':');
  
  // 验证凭据
  if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
    return new Response('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"'
      }
    });
  }
  
  // 验证通过，继续请求
  return next();
}
