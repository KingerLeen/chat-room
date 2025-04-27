import Head from "next/head";
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/chat-room'); // 服务端跳转（SEO 友好）
}

// export default function Home() {
//   return (
//     <>
//       <Head>
//         <title>Chat Room</title>
//         <link rel="icon" href="/favicon.ico" />
//       </Head>
//     </>
//   );
// }
