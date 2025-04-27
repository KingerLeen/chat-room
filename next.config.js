/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  output: "standalone",
  // 自定义页面目录
  // pageExtensions: ["page.tsx", "page.jsx"], // 可选：限制文件后缀

  sassOptions: {
    // includePaths: [path.join(__dirname, 'styles')],
  },
};
