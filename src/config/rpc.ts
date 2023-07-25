export const chainIdToRpc = {
  // 80001: {
  //   imageURL: '',
  //   rpc: 'https://polygon-mumbai.g.alchemy.com/v2/F73qsP3DkIt1P4M9igamwlvEuI9zPtDO',
  //   name: 'Mumbai',
  // },
  137: {
    chainID: 137,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/2bfa6fe3b12593ddc55d622bfbaf7569.svg',
    rpc: 'https://matic.getblock.io/dedicated/mainnet/994e9e72-ae0f-4a9c-b142-435258d41261',
    rpc2: 'https://matic.getblock.io/dedicated/mainnet/994e9e72-ae0f-4a9c-b142-435258d41261',
    name: 'MATIC',
    networkName: 'MATIC',
    isStakingAvailable: true,
    isSwapAvailable: true,
    contractURL:
      'https://polygonscan.com/address/0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
  },
  // 43113: {
  //   imageURL: 'https://api.stableonegroup.io/media-upload/mediaFiles/test/2bfa6fe3b12593ddc55d622bfbaf7569.svg',
  //   rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
  //   name: 'Avax Testnet',
  // },
  43114: {
    chainID: 43114,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/863c9e3d128282105a9be74284564af1d.svg',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    name: 'AVAX',
    networkName: 'AVAX',
    contractURL: '',
    isSwapAvailable: true,
  },
  1: {
    chainID: 1,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/bdd46c7b22e93cc44437cee38f10bf21a.svg',
    rpc: 'https://rpc.ankr.com/eth',
    name: 'ETH',
    networkName: 'ETH',
    contractURL: '',
    isSwapAvailable: true,
  },
  56: {
    chainID: 56,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/b33f9b96b4e4546e61146a56c36cde91.svg',
    rpc: 'https://bscrpc.com',
    name: 'BNB',
    networkName: 'BNB',
    contractURL:
      'https://bscscan.com/address/0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa#code',
    isSwapAvailable: true,
  },
  // 97: {
  //   imageURL: '',
  //   rpc: 'https://bscrpc.com',
  //   name: 'BSC Testnet',
  // },
  250: {
    chainID: 250,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/34c6028aab37009d84abb9a10d583f23d.png',
    rpc: 'https://rpcapi.fantom.network/',
    name: 'FTM',
    networkName: 'FTM',
    contractURL: '',
    isSwapAvailable: true,
  },
  '56 BUSD': {
    chainID: 56,
    imageURL:
      'https://api.stableonegroup.io/media-upload/mediaFiles/test/b33f9b96b4e4546e61146a56c36cde91.svg',
    rpc: 'https://bscrpc.com',
    name: 'BUSD',
    networkName: 'BNB',
    isToken: true,
    isStakingAvailable: true,
    isSwapAvailable: false,
    contractURL:
      'https://bscscan.com/address/0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
  },
  '137 SROCKET': {
    chainID: 137,
    imageURL:
      'https://assets.coingecko.com/coins/images/26361/large/srocket.jpeg?1657595223',
    rpc: 'https://matic.getblock.io/dedicated/mainnet/994e9e72-ae0f-4a9c-b142-435258d41261',
    name: 'SROCKET',
    networkName: 'MATIC',
    isToken: true,
    isStakingAvailable: false,
    isSwapAvailable: false,
  },
  // '97 BUSD': {
  //   chainID: 97,
  //   imageURL:
  //     'https://api.stableonegroup.io/media-upload/mediaFiles/test/b33f9b96b4e4546e61146a56c36cde91.svg',
  //   ,
  //   name: 'BUSD',
  //   isToken: true,
  //   isStakingAvailable: true,
  // },
};

export const stableFundChainIDToAddress = {
  137: {
    contract: '0x0dc733a0c086a113a88ddab7c4160dc097b6f89a',
  },
  '56 BUSD': {
    contract: '0xfbbc24ca5518898fae0d8455cb265faaa66157c9',
  },
  56: {
    contract: '0x4f2bc1d99c953e0053f5bb9a6855cf7a5cbe66fa',
  },
};

export const blocked_users = [
  "0x0004fc4acfa9096994c8ec8e946a7a5fe2618b9f",
  "0x00c6ed66775461d6fefaa437feb93c6bd1dd6bf8",
  "0x00e99db8dc98a8b8b34af9c4584d114468809b30",
  "0x00f3ec679366dbfbc56494303829bca38d20773a",
  "0x000123685d15ce53a6dab5b4c9227d115dfc7366",
"0x0004fc4acfa9096994c8ec8e946a7a5fe2618b9f",
"0x001cd4aac71e861a59495677ab85c05d4bfc421a",
"0x001ff32aae52fdeda7af1b19e8227b0ba7a5bdd1",
"0x0038f7e8060077b6d3a38a24417b3c9297613abd",
"0x0040d8d71609663d44cb8898c928576eeb4f62e2",
"0x00426ec496d6aeac556fbd3e1e00a307ab7f5211",
"0x004755cfb752958099bfcf325c8b26ceed59eef4",
"0x0049cf3fed29e3bb69a2019cdc1c3815b3475a12",
"0x004a3cfe79bef5bd3ff293f2542db8032007285c",
"0x004dcea850014c322f7e25981f9a50133d24fe07",
"0x004e186c48417c7f1d73450e32c092d039676b31",
"0x00536afd000482de812f631818dd3063c341e82d",
"0x00565933b3670fd1155e77cd0461fadfe97fdb0e",
"0x0060c995384dbe7fe960de2e1a1253a73ada17b9",
"0x006c124ef4bdbc08a8961d69ebff97bfe3d45a79",
"0x0095f966221350430cbb3ee6afb09ffa91223492",
"0x00a738ae67705bc7f729b613048cdf08884a83f6",
"0x00c44044d74ea0feaee4721d93dcbd3dd97d0fc0",
"0x00c6ed66775461d6fefaa437feb93c6bd1dd6bf8",
"0x00cb76ed96c4cfb33987cf2ed0070be645873ff5",
"0x00d0669e72546870dff4e814a6a3f51a034c87bd",
"0x00e99db8dc98a8b8b34af9c4584d114468809b30",
"0x00f3ec679366dbfbc56494303829bca38d20773a",
"0x00f40dc02504bb17a26209b1175edd47b76e43cc",
"0x00fa93a581bcccaad6728ac99231170546dea9e6",
"0x00fd9aed4a6586537d54d926283f7047524dea22",
"0x01064d9074a3f02c9a8994dbc938c8329864d2b5",
"0x0116e49e3d07e4d34829aea8537b9e2685e669a3",
"0x012cd0b5610529466bdb54c62f37d6c4e2abb027",
"0x0137b0537e10dec19088be3775ecb3361d801470",
"0x016984350e3c8af20c11a74595b8f2f86df70bdc",
"0x016be919b52f0e2358efa57ef67a3297132b9a31",
"0x017a98defab0047f728b72cc57e0dd43b163a2fd",
"0x018c7846d5c075cdc86de942e5b84245f7dac74c",
"0x018e2348b75ef488b6d17f8eacf9888c5806b3e5",
"0x01a3092fef94262fea915ca5020ecf20f1b3c81f",
"0x01ac6df61981244c491cf8169ffa693f7d44b7e9",
"0x01ad4f491a347bfd944e8ddf9aed5a0896c1f918",
"0x01b3bb31b7abe89841fd69ebf1843426bad15a73",
]

export const blocked_users_ids = [
  "62a1d8915b042beb6b02e614",
  "62fda908316c60f0fa627c35",
  "629e2c8da93b0543905e4c2b",
  "630e215707035ee8b6171548",
  "62ac80e97993f669ad6e2b53",
]