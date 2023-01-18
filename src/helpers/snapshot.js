import Bottleneck from 'bottleneck'
import { chunk, flatten } from 'lodash';
const axios = require('axios');

async function getNftOwner(addresses) {

  try {
    const headers = {
      'Content-Type': 'application/json'
    }
    const data = addresses.map(address => {
      return {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "getTokenLargestAccounts",
        "params": [
          address,
          {
            commitment: 'finalized',
          }
        ]
      }
    })

    const res = await axios.post(process.env.NEXT_PUBLIC_RPC_HOST, data, { headers })

    const accounts = res.data.map((item, i) => {
      if (!item.result) {
        return null;
      }
      if (item.result.value[0] && item.result.value[0].uiAmount === 1) {
        return {
          account: item.result.value[0].address,
          address: addresses[i]
        }
      } else {
        return null
      }
    }).filter(Boolean)

    const mutlipleAccData = {
      "jsonrpc": "2.0",
      "id": 3,
      "method": "getMultipleAccounts",
      "params": [
        accounts.map(a => a.account),
        {
          commitment: 'finalized',
          encoding: 'jsonParsed'
        }
      ]
    }

    const info = await axios.post(process.env.NEXT_PUBLIC_RPC_HOST, mutlipleAccData, { headers })
    const infos = info.data.result.value;

    return infos.map((item, i) => {
      return {
        mint: accounts[i].address,
        owner: item.data.parsed.info.owner
      }
    });
  } catch (err) {
    console.log(err)
    return getNftOwner(addresses);
  }
}

function getNftOwners(addresses, timeout, updateProgress) {
  let progress = 0;
  const limiter = new Bottleneck({
    minTime: timeout
  });

  const chunks = chunk(addresses, 100);

  async function getOwner(ads) {
    const owners = await getNftOwner(ads);
    progress += ads.length
    updateProgress(progress / addresses.length * 100)
    return owners;
  }

  const limited = limiter.wrap(getOwner)

  const allTasks = chunks.map(limited);
  return Promise.all(allTasks).then(flatten)

}


export async function takeSnapshot(addresses, timeout = 50, updateProgress) {
  const owners = await getNftOwners(addresses, timeout, updateProgress);

  return owners.reduce((snapshot, item) => {
    const obj = snapshot[item.owner];
    if (!obj) {
      return {
        ...snapshot,
        [item.owner]: {
          amount: 1,
          mints: [
            item.mint
          ]
        }
      }
    }

    obj.mints.push(item.mint)
    obj.amount++;

    return {
      ...snapshot,
      [item.owner]: obj
    };

  }, {});
}
