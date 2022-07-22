const UrlModel = require("../Models/urlModels");
const shortid = require("shortid");
const validUrl = require("valid-url");
const reurl = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  19050,
  "redis-19050.c16.us-east-1-3.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("zOCaGgy6fr3ZB1jdTlCUG8Q7UibJAuUB", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});





const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const urlCreate = async function (req, res) {
  let { longUrl } = req.body;
  if (Object.keys(req.body).length == 0) { return res.status(400).send({ status: false, msg: "Bad request- Please enter details in the request Body " }) }
  if (!x(longUrl)) { return res.status(400).send({ status: false, msg: "Please enter your longUrl" }) }
  longUrl=longUrl.trim()
  const baseUrl = "http://localhost:3000"

  // Check base url
  if (!validUrl.isUri(baseUrl)) {
    return res.status(400).send({ status: false, message: 'Invalid base url' });
  }

  // Create url code
  const urlCode = shortid.generate();

  // Check long url
  if (validUrl.isUri(longUrl) && reurl.test(longUrl)) {
    try {
      let cahcedProfileData = await GET_ASYNC(`${longUrl}`)
      if (cahcedProfileData) {
        res.status(200).send(cahcedProfileData)
      } else {
        let url = await UrlModel.findOne({ longUrl }).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 });
        await SET_ASYNC(`${longUrl}`, JSON.stringify(url))

        if (url) {
          return res.status(200).send({ status: true, data: url });

        } else {
          const shortUrl = baseUrl + '/' + urlCode;

          deRurl = {
            longUrl: longUrl,
            shortUrl: shortUrl,
            urlCode: urlCode
          };

          let newUrl = await UrlModel.create(deRurl);
          let finelResult = await UrlModel.findById(newUrl._id).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 })
          await SET_ASYNC(`${longUrl}`, JSON.stringify(finelResult))
          res.status(200).send({ status: true, data: finelResult });
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  } else {
    res.status(400).send({ status: false, message: 'Invalid long url' });
  }
};

function x(data) {
  if (!data || data == null || data === undefined || data.trim() == 0) return false;
  return true
}


const getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode
    if (!x(urlCode)) return res.status(400).send({ status: false, message: "enter valid urlcode" })
    if (!(urlCode.length >= 7 && urlCode.length <= 14)) return res.status(400).send({ status: false, message: "Enter a valid urlcode" })
    //taking data from cache
    let cahcedUrlData = await GET_ASYNC(`${urlCode}`)

    let data = JSON.parse(cahcedUrlData);

    //if data present in cache
    if (cahcedUrlData) {
      res.redirect(`${data.longUrl}` ,  302)
    }
    else {

      //if data is not there in cache
      let urlData = await UrlModel.findOne({ urlCode: urlCode })

      if (!urlData) {
        return res.status(404).send({ status: false, msg: "this url does not exist please provide valid url  " })
      }

      //setting data in cache
      await SET_ASYNC(`${urlCode}`, JSON.stringify(urlData))

      return res.redirect(`${urlData.longUrl}` ,  302)
    }

  }
  catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

module.exports = { urlCreate, getUrl }

