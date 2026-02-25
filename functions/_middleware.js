export async function onRequest(context) {
  const { request, next } = context;
  
  // 设置用户名和密码
  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'cirm2026';
  
  // 获取 Cookie 中的登录状态
  const cookie = request.headers.get('Cookie') || '';
  const isLoggedIn = cookie.includes('auth=valid');
  
  // 已登录，直接放行
  if (isLoggedIn) {
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
          // Max-Age=86400 表示 Cookie 有效期 24 小时
        }
      });
    } else {
      // 登录失败，返回错误页面
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 400px;
    }
    h2 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      font-size: 24px;
    }
    .error {
      background: #fee;
      color: #c33;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      display: ${error ? 'block' : 'none'};
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-size: 14px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .info {
      text-align: center;
      margin-top: 20px;
      color: #888;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h2>🔒 访问授权</h2>
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
    <div class="info">CIRM Data Portal 内部系统</div>
  </div>
</body>
</html>`;
}
