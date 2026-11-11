import express, { json } from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify } from 'jose';

const client = new MongoClient(process.env.MONGODB_URI);


export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);


  }

}
const mongoClient=await connectToMongoDB()
const db=mongoClient.db('wonderlust');
const destinationCollection=db.collection('destination')
const bookingCollection=db.collection('booking')

const app = express()
const port=8000;

app.use(
  cors({
    origin: [
      "http://localhost:3000",            // local client (Next.js/React)
      "https://wanderlust-go.vercel.app",   // deployed client URL
    ],
    credentials: true, // cookie/auth header pathale lagbe
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json())

app.get('/',(req,res)=>{
    res.send({mas:'Server Running'})
})


const VerifyUser =async (req, res, next) => {
  const authHeaders = req.headers.authorization;

  // console.log("JWT:", authHeaders);

  if (!authHeaders) {
    return res.status(401).send({ message: "Authorization token required" });
  }

  const token = authHeaders.slice(7).trim(); 
    if (!token) {
    return res.status(401).send({ message: "Authorization token required" });
  }
  // console.log(token);
   const JWKS=createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

  try { 
    const { payload } = await jwtVerify(token, JWKS);
    next();
    console.log('payload',payload)
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
 
};


app.post('/add-destination',VerifyUser,async (req,res)=>{
        const data=req.body;
        const result=await destinationCollection.insertOne(data)
      // console.log(result)
      res.send(result)
})


app.get('/destination',async(req,res)=>{

       const result=await destinationCollection.find().toArray();
      //  console.log(result)
       res.send(result)
})

app.get('/destination/:id', async (req, res) => {

       const id = req.params.id;
       if (!ObjectId.isValid(id)) {
         return res.status(400).send({ message: 'Invalid destination ID' });
       }
       const result = await destinationCollection.findOne({
         _id: new ObjectId(id),
       });
       if (!result) {
         return res.status(404).send({ message: 'Destination not found' });
       }
       res.send(result);
})

app.patch("/destination/:id",  async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await destinationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: data },
  );
  res.json(result);
});

app.delete("/destination/:id",  async (req, res) => {
  const { id } = req.params;
  const result = await destinationCollection.deleteOne(
    { _id: new ObjectId(id) },
  );
  res.json(result);
  // console.log(result)
});

// booking post 

app.post('/booking',  async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    const result = await bookingCollection.insertOne(data);
    res.send(result);

  } catch (error) {
    console.log("Booking Error:", error);
    res.status(500).send({
      message: "Failed to create booking",
      error: error.message
    });
  }
});
 

app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection.find({ email: email }).toArray();
  res.send(result);
});


app.delete("/my-bookings/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid booking ID" });
  }
  const result = await bookingCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


app.listen(port, ()=>{
      console.log(`Example app listening on port ${port}`)
})

export default app