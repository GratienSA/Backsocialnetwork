const jwt = require('jsonwebtoken');
const { pool } = require("../services/mysql");

async function extractToken(req) {
  if (req.headers.authorization) {
    const headerWithToken = req.headers.authorization;
    const bearer = headerWithToken.split(' ');
    const token = bearer[1];
    return token;
  } else {
    return null;
  }
}


async function verifyToken(token, key, res, user, id_user) {
  jwt.verify(token, key, async (err, authData) => {
    if (err) {
      res.status(401).json({ err: `Unauthorized - ${err}` });
      console.log('erreur')
      return;
    } else {
      try {
       
        
        pool.query(`SELECT * FROM ${user} WHERE ${id_user} = ?`, [authData.id], async (error, results,) => {
          if (error) {
            
            res.status(500).json({ err: 'Erreur lors de la récupération des données' });
            return;
          }
         
          res.status(200).json(results);
        });
      } catch (e) {
        res.status(500).json({ err: 'Erreur interne du serveur' });
      }
    }
  });
}

module.exports = { extractToken, verifyToken };
