import "@ant-design/v5-patch-for-react-19";

import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";
import { ConfigProvider } from "antd";

export const metadata: Metadata = {
  title: "Chat Room",
  description: "Chat Room",
};

const theme = {};

const App = ({ children }) => {
  return (
    <ConfigProvider theme={theme}>
      <AntdRegistry>{children}</AntdRegistry>
    </ConfigProvider>
  );
};
App.displayName = "App";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <title>Chat Room</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Chat Room" />
        <meta name="keywords" content="Chat Room" />
        <meta name="author" content="Chat Room" />
      </head>
      <body>
        <App>{children}</App>
      </body>
    </html>
  );
}
