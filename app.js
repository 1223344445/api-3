const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'covid19India.db')

const intializedbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('The Server is running on http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}

intializedbAndServer()

const convertdbObj = eachState => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  }
}

app.get('/states/', async (request, response) => {
  const getAllstatesQuery = `SELECT * FROM state;`
  const statesList = await db.all(getAllstatesQuery)
  response.send(statesList.map(eachState => convertdbObj(eachState)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `SELECT * FROM state WHERE state_id=${stateId};`
  const stateDetails = await db.get(getstateQuery)
  response.send(convertdbObj(stateDetails))
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const createDistrictTableQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `
  await db.run(createDistrictTableQuery)
  response.send('District Successfully Added')
})

const convertdistrictdbObj = districtdb => {
  return {
    districtId: districtdb.district_id,
    districtName: districtdb.district_name,
    stateId: districtdb.state_id,
    cases: districtdb.cases,
    cured: districtdb.cured,
    active: districtdb.active,
    deaths: districtdb.deaths,
  }
}

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `SELECT * FROM district WHERE district_id=${districtId};`
  const districtDetails = await db.get(getDistrictQuery)
  response.send(convertdistrictdbObj(districtDetails))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetailsTo = request.body
  const {districtName, stateId, cases, cured, active, deaths} =districtDetailsTo
  const updateQuery = `UPDATE district SET 
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE district_id=${districtId};
  `
  await db.run(updateQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params

  const getStateQuery = `SELECT sum(cases) as totalCases,SUM(cured) as totalCured,SUM(active) as totalActive,SUM(deaths) as totalDeaths FROM district WHERE state_id=${stateId};`

  const stats = await db.get(getStateQuery)

  response.send({
    totalCases: stats.totalCases,
    totalCured: stats.totalCured,
    totalActive: stats.totalActive,
    totalDeaths: stats.totalDeaths,
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const { districtId } = request.params
  const getDistrictIdQuery = `SELECT state_id FROM district WHERE district_id=${districtId};`
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)
  
  const getStateNameQuery = `SELECT state_name FROM state WHERE state_id=${getDistrictIdQueryResponse.state_id};`
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  
  response.send({ stateName: getStateNameQueryResponse.state_name })
})


module.exports = app
