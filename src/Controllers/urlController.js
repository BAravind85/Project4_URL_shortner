const UrlModel = require("../Models/urlModels");
const shortid = require("shortid");
const validUrl = require("valid-url");
const redis=require("redis");
const { promisify } = require("util");

const reurl=/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/

//Redis connect
const redisClient = redis.createClient(
  13190,
  "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :
//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const urlCreate = async function (req, res) {
    const { longUrl } = req.body;
    if (Object.keys(req.body).length == 0) { return res.status(400).send({ status: false, msg: "Bad request- Please enter details in the request Body " }) }
    //if (!x(longUrl)) { return res.status(400).send({ status: false, msg: "Please enter your longUrl" }) }

  const baseUrl = "http://localhost:3000"

  // Check long url
  if (!validUrl.isUri(longUrl)) {
    return res.status(400).send({status:false,message:'Invalid long URL'});
  }

  // Create url code
  const urlCode = shortid.generate();

  // Check long url
  if (validUrl.isUri(longUrl)&&reurl.test(longUrl)) {
    try {
      let url = await UrlModel.findOne({ longUrl }).select({longUrl:1,shortUrl:1,urlCode:1,_id:0});

      if (url) {
       return res.status(200).send({status:true,data:url});

      } else {
        const shortUrl = baseUrl + '/' + urlCode;

        deRurl ={longUrl,shortUrl,urlCode};

        let newUrl=await UrlModel.create(deRurl);
        await SET_ASYNC(`${longUrl}`,JSON.stringify(newUrl));
        return res.status(200).send({status:true,data:newUrl});
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  } else {
    res.status(400).send({status:false,message:'Invalid long url'});
  }
};


const getUrl= async function (req, res){
    try{
        let url=req.params.urlCode;
        let cacheUrl=await GET_ASYNC(`${url}`)
        let data=JSON.parse(cacheUrl);
        if(cacheUrl){
        return res.status(302).redirect(data.longUrl)
      }else{
        let findUrl=await UrlModel.findOne({urlCode:url}).select({longUrl:1,shortUrl:1,urlCode:1,_id:0})
        if(!findUrl){
          return res.status(404).send({status:false,message:"Not found this URL"})
      }
      await SET_ASYNC(`${url}`,JSON.stringify(findUrl));
      res.status(302).redirect(findUrl.longUrl);
    }
        
    }catch(err){
        return res.status(500).send('Server error');
    }
}



module.exports = { urlCreate,getUrl}