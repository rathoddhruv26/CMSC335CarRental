const path = require("path");
const http = require("http");
const express = require("express");
const portNumber = 5000;
const prompt = "Stop to shutdown the server: ";
const bodyParser = require("body-parser");
require("dotenv").config({path: path.resolve(__dirname, '.env')})

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: "CMSC335_DB", collection: "carCatalog"};

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${userName}:${password}@cluster0.isdphy6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

const app = express();

app.use(bodyParser.urlencoded({extended:false}));

app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(__dirname));

app.set("view engine", "ejs");

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/rent", (request, response) => {
    let options = "";

    (async () =>{
        try {
            await client.connect();
            let cars = await getAll(client, databaseAndCollection);

            for (let i = 0; i < cars.length; i++) {
                if (cars[i].rented == false){
                    options += `<option value =` + `\"${cars[i].year} ${cars[i].make} ${cars[i].model}\"` + `>${cars[i].year} ${cars[i].make} ${cars[i].model}</option>`;
                }
            }

            const variables = {
                cars: options
            };

            response.render("rentalPage", variables);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    })();
});

app.post("/processRental", (request, response) => {
    const variables = {
        car: request.body.car,
        name: request.body.name,
        email: request.body.email,
        city: request.body.city,
        from: request.body.from,
        to: request.body.to
    };

    response.render("rentConfirm", variables);
});

app.get("/return", (request, response) => {

    response.render("returnPage");
});

app.get("/submit", (request, response) => {

    response.render("submitPage");
});




app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write(prompt);
process.stdin.setEncoding("utf8");

process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    if(dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
})

async function getAll(client, databaseAndCollection) {
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find({});
    const result = await cursor.toArray();

    return result;
}
