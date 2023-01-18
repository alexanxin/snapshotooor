import '../scripts/wdyr'
import { ThemeProvider } from '@emotion/react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, SlopeWalletAdapter, BackpackWalletAdapter, BraveWalletAdapter } from '@solana/wallet-adapter-wallets';
import React, { useMemo } from 'react';
import { NftsProvider } from '../context/nft';
import { HashlistProvider } from '../context/hashlist';
import hashlist from '../hashlist.json'
import { createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

// Use require instead of import since order matters
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App = ({ Component, pageProps }) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new SlopeWalletAdapter(),
      new BackpackWalletAdapter(),
      new BraveWalletAdapter()
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <ThemeProvider theme={theme}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <NftsProvider includedMints={hashlist}>
              <HashlistProvider>
                <Component {...pageProps} />
              </HashlistProvider>
            </NftsProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ThemeProvider>
    </ConnectionProvider>
  );
};

export default App;
