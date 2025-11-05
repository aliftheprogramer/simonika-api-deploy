import '@/styles/globals.css';
import Head from 'next/head';

const App = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>SIMONIKA</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
};

export default App;
