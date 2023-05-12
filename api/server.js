//all this code is node.js code

const express = require('express')
const multer = require('multer')
const cors = require('cors');
const axios = require('axios')
const app = express()
const port=process.env.PORT || 5000

//starton API Key --- sk_live_bd940582-1bb4-4036-a0a6-151e73ebd14f

app.use(express.json())

//to put limit to a file size of uploading image
const upload = multer({
    limits:{
        fileSize:1000000
    }
})

//to connect with starton and this api help us to connect starton with blockchain
const starton = axios.create({
    baseURL: "https://api.starton.io/v3",
    headers: {
        "x-api-key": "sk_live_bd940582-1bb4-4036-a0a6-151e73ebd14f",
    },
  })

  app.post('/upload',cors(),upload.single('file'),async(req,res)=>{
   
    //for file handling
    let data = new FormData();
    const blob = new Blob([req.file.buffer],{type:req.file.mimetype});
    data.append("file",blob,{filename:req.file.originalnam})
    data.append("isSync","true");

    //for upload img to ipfs
    async function uploadImageOnIpfs(){
        const ipfsImg = await starton.post("/ipfs/file", data, {
            headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
          })
          return ipfsImg.data;
    }

    //for uploading metadata to ipfs
    async function uploadMetadataOnIpfs(imgCid){
        const metadataJson = {
            name: `A Wonderful NFT`,
            description: `Probably the most awesome NFT ever created !`,
            image: `ipfs://ipfs/${imgCid}`,
        }
        const ipfsMetadata = await starton.post("/ipfs/json", {
            name: "My NFT metadata Json",
            content: metadataJson,
            isSync: true,
        })
        return ipfsMetadata.data;
    }
    
    const SMART_CONTRACT_NETWORK="polygon-mumbai"
    const SMART_CONTRACT_ADDRESS="0xb9b25de52AfC3c02fECbdfCd924Cc07cF4EaF91b" //this address id from starton
    const WALLET_IMPORTED_ON_STARTON="0x01a8136820A9C22C8A50a8D1984F881C30d17804"; //this addres is from straton
    async function mintNFT(receiverAddress,metadataCid){
        const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
            functionName: "mint",
            signerWallet: WALLET_IMPORTED_ON_STARTON,
            speed: "low",
            params: [receiverAddress, metadataCid],
        })
        return nft.data;
    }
    const RECEIVER_ADDRESS = "0x49A137901Ecf8a0A733A91e98E1CECBF812ba2AE"
    const ipfsImgData = await uploadImageOnIpfs();
    const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
    const nft = await mintNFT(RECEIVER_ADDRESS,ipfsMetadata.cid)
    console.log(nft)
    res.status(201).json({
        transactionHash:nft.transactionHash,
        cid:ipfsImgData.cid
    })
  })
  app.listen(port,()=>{
    console.log('Server is running on port '+ port);
  })

  


