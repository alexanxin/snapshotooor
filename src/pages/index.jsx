import { AppBar, Box, Button, Card, CardContent, Checkbox, Container, createTheme, Fab, Grid, LinearProgress, List, ListItem, ListItemButton, Modal, ModalRoot, TextareaAutosize, TextField, ThemeProvider, Typography } from '@mui/material';
import { Transaction, PublicKey } from '@solana/web3.js';
import { Stack } from '@mui/system';
import { ConnectionContext, useConnection, useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../styles/Home.module.scss';
import toast, { Toaster } from 'react-hot-toast';
import { Spinner } from '../components/Spinner'
import { useHashlist } from '../context/hashlist';
import { useNfts } from '../context/nft';
import { takeSnapshot } from '../helpers/snapshot';
import { pollTransaction } from '../helpers/poll-transaction';
import { createBurnInstruction, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const GaugeChart = dynamic(
  async () => (await import("../components/Gauge")).GaugeChart,
  { ssr: false }
);


export function shorten(address) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

const WalletDisconnectButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
);
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const Controls = () => {
  const [snapping, setSnapping] = useState(false);
  const { nfts, nftsLoading } = useNfts();
  const { parsed, clearHash } = useHashlist();
  const [progress, setProgress] = useState(0)
  const wallet = useWallet();
  const { connection } = useConnection();
  const timer = useRef();

  let milliseconds = 0;

  function startTimer() {
    const startTime = Date.now();
    timer.current = setInterval(() => {
      const diff = Date.now() - startTime;
      milliseconds = diff
    }, 10)
  }

  function stopTimer() {
    clearInterval(timer.current);
    setProgress(0)
    setTimeout(() => milliseconds = 0, 1000)
  }

  function updateProgress(newProgress) {
    setProgress(newProgress)
  }

  function getThrottleSpeed(nfts) {
    if (!nfts.length) {
      return 1000
    }
    if (nfts.length >= 10) {
      return 30
    }
    if (nfts.length >= 5) {
      return 100
    }

    return 250
  }

  async function payForSnap() {
    const txn = new Transaction();
    const tokenMint = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
    const stakingWallet = new PublicKey('664rbSHy2fU4eHizSwxhFpkjSuY2mZaTZcPr4M2aYNBk')
    const cost = 52_065;
    const burn = 17_355;
    const mult = Math.pow(10, 5)

    const source = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
    const sourceAccDetails = await connection.getAccountInfo(source);

    if (sourceAccDetails === null) {
      throw new Error('$BONK account not found');
    }

    const destination = await getAssociatedTokenAddress(tokenMint, stakingWallet);
    const destinationAccDetails = await connection.getAccountInfo(destination);

    if (destinationAccDetails === null) {
      throw new Error('Something went wrong');
    }

    txn.add(
      createTransferInstruction(
        source,
        destination,
        wallet.publicKey,
        cost * mult
      )
    );
    
    txn.add(
      createBurnInstruction(
        source,
        tokenMint,
        wallet.publicKey,
        burn * mult
      )
    )
    
    txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    txn.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(txn)

    const txnId = await connection.sendRawTransaction(signed.serialize())

    const t = await pollTransaction(txnId)
      if (t && !t?.meta?.err) {
        return;
      } else {
        throw new Error('Error confirming transaction')
      }

  }

  async function doSnap() {
    const throttleSpeed = getThrottleSpeed(nfts)
    const holders = await takeSnapshot(parsed, throttleSpeed, updateProgress);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(holders, null, 2));
    const download = document.createElement('a');
    download.setAttribute("href", dataStr);
    download.setAttribute("download", "snapshot.json");
    download.click();
  }

  async function takeSnap() {
    try {
      if (!wallet.connected) {
        throw new Error('Wallet disconnected')
      }
      if (nfts.length) {
        await payForSnap()
      }
      setSnapping(true);
      startTimer()
      const snapPromise = doSnap()

      toast.promise(snapPromise, {
        loading: 'Turbo snapping',
        error: 'Error snapping - please try again'
      })

      await snapPromise;
      stopTimer();
      toast.success(`Snapped ${parsed.length} holders in ${milliseconds / 1000}s`)
    } catch (err) {
      console.log(err)
      toast.error('Error taking snap');
    } finally {
      setSnapping(false);
    }
  }

  let val = nfts.length * 14;
  if (val > 210) {
    val = 210
  } else if (val === 0) {
    val = 27
  } else {
    val += 40
  }

  return (
    <Stack className={styles['buttons-wrapper']} spacing={1}>
      <GaugeChart width={270} chartValue={val} />
      <Typography color="black" variant="h5" className={styles.holding} sx={{ fontFamily: 'Gilroys' }}>{nftsLoading ? 'Reading wallet...' : `Bears held: ${nfts.length}`}</Typography>
      {
        snapping && <LinearProgress variant="determinate" value={progress} />
      }
      <Button variant='contained' sx={{ backgroundColor: "#154E55" }} onClick={takeSnap} className={styles.send} disabled={!parsed.length || snapping}>{ snapping ? <Spinner small /> : 'Take Snap'}</Button>
      <Stack className={styles['bottom-buttons-wrap']} direction="row" spacing={1} size="large">
        <Button variant='contained' sx={{ backgroundColor: "#4A868E" }} onClick={clearHash} disabled={!parsed.length} size="medium">Clear</Button>
      </Stack>
    </Stack>
  )
}

const Home = () => {
  const wallet = useWallet()
  const { hashlist, setHashlist } = useHashlist();
  const cardConentStyles = useMemo(() => ({ overflowX: 'visible' }), [])
  const cardStyles = useMemo(() => ({ height: '100%', overflow: 'visible' }), [])
  const titleStyles = useMemo(() => ({textShadow: '0 0 10px rgba(0, 0, 0, 0.438)', fontSize: '64px'}), [])
  const boxStyles = useMemo(() => ({ color: 'white !important', overflowX: 'visible', overflowY: 'auto', height: '50vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }), []);

  function onInputChange(e) {
    const value = e.target.value;
    setHashlist(value)
  }

  return (
    <Container>
      <Head>
        <title>Dandy Snap</title>
        <meta name="description" content="Fastest snapshot tool on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Toaster />
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2} className={styles.toprow}>
          <Image src="/logo.png" width={150} height={150} className={styles.logo} alt="Dandies" />
          <Typography variant="h1" color="white" sx={titleStyles}>Dandy Snap</Typography>
          <WalletMultiButtonDynamic />
        </Stack>

        <Grid container spacing={4} className={styles.mboxfw}>
          <Grid item xs={12} minHeight="100%" className={styles.mboxf}>
            <Card sx={cardStyles} className='box'>
              <CardContent sx={cardConentStyles}>
                {
                  wallet.connected
                    ? <TextField
                      multiline
                      fullWidth
                      label="Hashlist"
                      value={hashlist}
                      onChange={onInputChange}
                      rows={15}
                      InputProps={{
                        sx: {
                          fontFamily: 'monospace !important',
                          whiteSpace: 'prewrap',
                        }
                      }}                      
                    >
                      <pre>Contnet</pre>
                    </TextField>
                    : <Box sx={boxStyles}>
                        <WalletMultiButtonDynamic />
                      </Box>
                }
                
              </CardContent>
              <ThemeProvider theme={lightTheme}>
                <Controls />
              </ThemeProvider>
            </Card>
          </Grid>
        </Grid>
      </Stack>
      <Typography variant="h4" textAlign="center" mt={5}><a href="https://www.xlabs.so/"><img src="/xlaunchpad.png" alt="XLaunchpad logo" className="xlabs" width={100}/></a></Typography>
    </Container>
  );
};

export default Home;
