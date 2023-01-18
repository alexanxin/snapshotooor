import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { createContext, FC, useContext, useEffect, useState } from "react";

const initial = {
  nfts: [],
  refresh: () => {},
}

const NftsContext = createContext(initial);

export const NftsProvider = ({ children, includedMints }) => {
  const wallet = useWallet()
  const [nfts, setNfts] = useState([]);
  const [nftsLoading, setNftsLoading] = useState(false)
  
  async function getNfts() {
    setNftsLoading(true)
    const { data: { nfts } } = await axios.get('/api/get-nfts', { params: { publicKey: wallet?.publicKey?.toString() }});
    setNfts(nfts)
    setNftsLoading(false)
  }

  useEffect(() => {
    if (wallet.connected) {
      getNfts();
    }
  }, [wallet.publicKey, wallet.connected])

  function refresh() {
    getNfts();
  }

  
  return (
    <NftsContext.Provider value={{ nfts, refresh, nftsLoading }}>
      { children }
    </NftsContext.Provider>
  )
}

export function useNfts() {
  return useContext(NftsContext)
}