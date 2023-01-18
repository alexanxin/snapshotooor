import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast"

const initial = {
  hashlist: '',
  setHashlist: () => {},
  clearHash: () => {}
}

const HashlistContext = createContext(initial)

export const HashlistProvider = ({ children }) => {
  const [hashlist, setHashlist] = useState('');
  const [parsed, setParsed] = useState([]);

  useEffect(() => {
    if (hashlist) {
      try {
        const p = JSON.parse(hashlist.trim())
        setParsed(p)
      } catch {
        toast.error('Invalid JSON')
        setParsed([])
      }
    } else {
      setParsed([])
    }
  }, [hashlist])

  function clearHash() {
    setHashlist('')
  }

  return (
    <HashlistContext.Provider value={{ hashlist, clearHash, setHashlist, parsed }}>
      { children }
    </HashlistContext.Provider>
  )
}

export const useHashlist = () => {
  return useContext(HashlistContext);
}