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
    (async () =>{
        try {
            await client.connect();
            text = request.body.car;
            const myArray = text.split(" ");
            const filter = {make: myArray[1], model: myArray[2], year: myArray[0]};
            const options = { upsert: false };
            const updateDoc = {
                $set: {
                    rented: true,
                    custCity: `${request.body.city}`,
                    custEmail: `${request.body.email}`,
                    custFrom: new Date(`${request.body.from}`),
                    custName: `${request.body.name}`,
                    custTo: new Date(`${request.body.to}`)
                },
            };

            await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .updateOne(filter, updateDoc, options)

            const variables = {
                car: request.body.car,
                name: request.body.name,
                email: request.body.email,
                city: request.body.city,
                from: request.body.from,
                to: request.body.to
            };
        
            response.render("rentConfirm", variables);

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    })();    
});

app.get("/return", (request, response) => {
    let options = "";

    (async () =>{
        try {
            await client.connect();
            let cars = await getAll(client, databaseAndCollection);

            for (let i = 0; i < cars.length; i++) {
                if (cars[i].rented == true){
                    options += `<option value =` + `\"${cars[i].year} ${cars[i].make} ${cars[i].model}\"` + `>${cars[i].year} ${cars[i].make} ${cars[i].model}</option>`;
                }
            }

            const variables = {
                cars: options
            };

            response.render("returnPage", variables);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    })();
});

app.post("/processReturn", (request, response) => {
    (async () =>{
        try {
            await client.connect();
            text = request.body.car;
            const myArray = text.split(" ");
            const filter = {make: myArray[1], 
                model: myArray[2], 
                year: myArray[0], 
                custCity: `${request.body.city}`,
                custEmail: `${request.body.email}`,
                custName: `${request.body.name}`,
            };
            
            const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter)

            if (result) {
                const options = { upsert: false };
                const updateDoc = {
                    $set: {
                        rented: false,
                        custCity: "",
                        custEmail: "",
                        custFrom: new Date('1990-01-01'),
                        custName: "",
                        custTo: new Date('1990-01-01')
                    },
                };

                await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .updateOne(filter, updateDoc, options)

                const variables = {
                    car: request.body.car,
                    name: request.body.name,
                    email: request.body.email,
                    city: request.body.city
                };

                response.render("returnConfirm", variables);
            } else {
                console.log(`No car rental found.`);
            }      

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    })();  
});

app.get("/submit", (request, response) => {
    response.render("submitPage");
});

app.post("/processSubmit", (request, response) => {
    (async () =>{
        try {
            let car = {
                make: `${request.body.make}`,
                model: `${request.body.model}`,
                year: `${request.body.year}`,
                licensePlate: `${request.body.licensePlate}`,
                rented: false,
                custCity: "",
                custEmail: "",
                custFrom: new Date('1990-01-01'),
                custName: "",
                custTo: new Date('1990-01-01')
            };

            let filter = {
                licensePlate: `${request.body.licensePlate}`
            };

            await client.connect();

            let result = await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .findOne(filter)

            if (result) {
                console.log("Car is in Inventory Already");
            } else {
                await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .insertOne(car)

                const variables = {
                    make: request.body.make,
                    model: request.body.model,
                    year: request.body.year,
                    licPlate: request.body.licensePlate,
                };
            
                response.render("submitConfirm", variables);
            }

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    })();    
});


app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write(prompt);
process.stdin.setEncoding("utf8");

process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    if(dataInput !== null) {
        let command = dataInput.trim();
        if (command.toLowerCase() == "stop") {
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
