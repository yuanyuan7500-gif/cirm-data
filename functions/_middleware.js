export async function onRequest(context) {
  const { request, next, env } = context;
  
  // 从环境变量读取用户名和密码
  const VALID_USERNAME = env.USERNAME || 'admin';
  const VALID_PASSWORD = env.PASSWORD || 'cirm2026';
  
  // 获取 Cookie
  const cookie = request.headers.get('Cookie') || '';
  const isLoggedIn = cookie.includes('auth=valid');
  
  // 获取请求 URL
  const url = new URL(request.url);
  
  // 处理退出登录
  if (url.pathname === '/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': 'auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'
      }
    });
  }
  
  // 已登录，直接放行（访问的是正常页面）
  if (isLoggedIn && url.pathname !== '/login') {
    return next();
  }
  
  // 处理 POST 登录请求
  if (request.method === 'POST') {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // 登录成功，设置 Cookie 并重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/',
          'Set-Cookie': 'auth=valid; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict'
        }
      });
    } else {
      // 登录失败
      return new Response(loginHTML('用户名或密码错误'), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
  }
  
  // 未登录，显示登录页面
  return new Response(loginHTML(), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

// 登录页面 HTML
function loginHTML(error = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - CIRM Data Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-box {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      width: 100%;
      max-width: 400px;
      border: 1px solid #e2e8f0;
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      margin-bottom: 16px;
    }
    h2 {
      text-align: center;
      color: #1e293b;
      margin-bottom: 8px;
      font-size: 22px;
      font-weight: 600;
    }
    .subtitle {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin-bottom: 28px;
    }
    .error {
      background: #fef2f2;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      border: 1px solid #fecaca;
      display: ${error ? 'block' : 'none'};
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
      background: #fafafa;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .info {
      text-align: center;
      margin-top: 24px;
      color: #94a3b8;
      font-size: 12px;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="logo">
      <div class="logo-icon">🧬</div>
      <h2>CIRM Data Portal</h2>
      <div class="subtitle">CIRM数据平台</div>
    </div>
    <div class="error">${error}</div>
    <form method="POST" action="/">
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required placeholder="请输入用户名" autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required placeholder="请输入密码" autocomplete="current-password">
      </div>
      <button type="submit">登 录</button>
    </form>
    <div class="divider"></div>
    <div class="info">内部数据系统，仅限授权访问</div>
  </div>
</body>
</html>`;
}
