module.exports = {
  apps: [{
    name: "code",
    script: "server/index.js",
    cwd: "D:/Projects/CodexMobile",        // 锁定工作目录，确保 .env 路径正确
    node_args: "--env-file=.env",          // 关键：传递 Node 原生参数
    instances: 1,
    autorestart: true,                     // 崩溃自动重启
    max_memory_restart: "1G",              // 内存超 1G 自动重启
    error_file: "./logs/pm2-err.log",
    out_file: "./logs/pm2-out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss"
  }]
};

/*
一行启动
pm2 start server/index.js --name "my-app" --node-args="--env-file=.env"
使用config.js启动
pm2 start ecosystem.config.js

pm2 status            # 查看进程状态（应为 online）
pm2 logs my-app       # 实时查看合并日志
pm2 logs my-app --err # 仅看错误日志
pm2 stop my-app       # 停止
pm2 restart my-app    # 重启
pm2 delete my-app     # 彻底移除进程配置
pm2 save              # 保存当前进程列表（配合 pm2 startup 可实现开机自启）
*/
