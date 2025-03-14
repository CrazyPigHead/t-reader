import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface RequestOptions extends https.RequestOptions {
  method?: string; // 请求方法，默认为 GET
  headers?: Record<string, string>; // 自定义请求头
  body?: any; // 请求体数据
  proxy?: string | undefined; // 代理服务器地址，例如 'http://your-proxy-server:port'
}

export function fetch(url: string, options: RequestOptions = {}): Promise<string> {
  const { method = 'GET', headers = {}, body, proxy } = options;

  const reqOptions: https.RequestOptions = {
    ...options,
    method,
    headers: {
      // 'Content-Type': 'application/json', // 默认 Content-Type
      ...headers,
    },
  };

  // 如果设置了代理，则创建代理代理器
  if (proxy) {
    reqOptions.agent = new HttpsProxyAgent(proxy);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, reqOptions, (response) => {
      let data = '';

      // 接收数据片段
      response.on('data', (chunk) => {
        data += chunk;
      });

      // 数据接收完成
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${response.statusCode}`));
        }
      });
    });

    // 请求错误处理
    req.on('error', (err) => {
      reject(err);
    });

    // 如果有请求体，则写入请求体
    if (body) {
      const requestBody =
        typeof body === 'object' ? JSON.stringify(body) : body.toString();
      req.write(requestBody);
    }

    // 结束请求
    req.end();
  });
}