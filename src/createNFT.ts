import { initializeKeypair } from "./initializeKeypair"
import { Connection, clusterApiUrl, PublicKey, Signer } from "@solana/web3.js"
import {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
    NftWithToken,
} from "@metaplex-foundation/js"
import * as fs from "fs"

interface NftData {
    name: string
    symbol: string
    description: string
    sellerFeeBasisPoints: number
    imageFile: string
}

interface CollectionNftData {
    name: string
    symbol: string
    description: string
    sellerFeeBasisPoints: number
    imageFile: string
    isCollection: boolean
    collectionAuthority: Signer
}

const NftData = {
    name: "Pikachu",
    symbol: "SYMBOL",
    description: "This is my Pokemon",
    sellerFeeBasisPoints: 0,
    imageFile: "nft.jpg",
}

/* // example data for updating an existing NFT
const updateNftData = {
  name: "Update",
  symbol: "UPDATE",
  description: "Update Description",
  sellerFeeBasisPoints: 100,
  imageFile: "success.png",
} */

async function uploadMetadata(
    metaplex: Metaplex,
    nftData: NftData
): Promise<string> {
    const buffer = fs.readFileSync("src/" + nftData.imageFile)


    const file = toMetaplexFile(buffer, nftData.imageFile)


    const imageUri = await metaplex.storage().upload(file)
    console.log("image uri:", imageUri)


    const { uri } = await metaplex.nfts().uploadMetadata({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        image: imageUri,
    })

    console.log("metadata uri:", uri)
    return uri
}

async function createNft(
    metaplex: Metaplex,
    uri: string,
    nftData: NftData,
    collectionMint: PublicKey
): Promise<NftWithToken> {
    const { nft } = await metaplex.nfts().create(
        {
            uri: uri, // metadata URI
            name: nftData.name,
            sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
            symbol: nftData.symbol,
            collection: collectionMint,
        },
        { commitment: "finalized" }
    )

    console.log(
        `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
    )

    await metaplex.nfts().verifyCollection({
        mintAddress: nft.mint.address,
        collectionMintAddress: collectionMint,
        isSizedCollection: true,
    })

    return nft
}

async function createCollectionNft(
    metaplex: Metaplex,
    uri: string,
    data: CollectionNftData
): Promise<NftWithToken> {
    const { nft } = await metaplex.nfts().create(
        {
            uri: uri,
            name: data.name,
            sellerFeeBasisPoints: data.sellerFeeBasisPoints,
            symbol: data.symbol,
            isCollection: true,
        },
        { commitment: "finalized" }
    )

    console.log(
        `Collection Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
    )

    return nft
}
/* 
// helper function update NFT
async function updateNftUri(
  metaplex: Metaplex,
  uri: string,
  mintAddress: PublicKey
) {
  // fetch NFT data using mint address
  const nft = await metaplex.nfts().findByMint({ mintAddress })

  // update the NFT metadata
  const { response } = await metaplex.nfts().update(
    {
      nftOrSft: nft,
      uri: uri,
    },
    { commitment: "finalized" }
  )

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  )

  console.log(
    `Transaction: https://explorer.solana.com/tx/${response.signature}?cluster=devnet`
  )
} */

async function main() {
    const connection = new Connection(clusterApiUrl("devnet"))

    const user = await initializeKeypair(connection)

    console.log("PublicKey:", user.publicKey.toBase58())

    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(user))
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            })
        )

    const collectionNftData = {
        name: "TestCollectionNFT",
        symbol: "TEST",
        description: "Test",
        sellerFeeBasisPoints: 100,
        imageFile: "collection.png",
        isCollection: true,
        collectionAuthority: user,
    }

    const collectionUri = await uploadMetadata(metaplex, collectionNftData)

    const collectionNft = await createCollectionNft(
        metaplex,
        collectionUri,
        collectionNftData
    )

    const uri = await uploadMetadata(metaplex, NftData)

    const nft = await createNft(
        metaplex,
        uri,
        NftData,
        collectionNft.mint.address
    )

    /*   // upload updated NFT data and get the new URI for the metadata
      const updatedUri = await uploadMetadata(metaplex, updateNftData)
    
      // update the NFT using the helper function and the new URI from the metadata
      await updateNftUri(metaplex, updatedUri, nft.address) */
}

main()
    .then(() => {
        console.log("Finished successfully")
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })