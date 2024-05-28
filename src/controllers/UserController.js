const { pool } = require('../services/mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
require('dotenv').config();
const { validateName, validateEmail, validatePassword } = require('../utils/validators');
const path = require('path');
const multer = require('multer');
const app = express();
const { transporter } = require('../services/mailer');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const uploadDirectory = path.join(__dirname, '..', '/uploads');
// const uploadDirectory="./uploads"

console.log(uploadDirectory)
const insertProfilePicture = async (req, res) => {
  let newFileName
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      newFileName = file.fieldname + '-' + uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-').replace(/[^\w.-]/g,'')
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-').replace(/[^\w.-]/g, ''));
    }
  });
  

  const maxSize = 3 * 1000 * 1000

  let upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
      var filetypes = /jpeg|jpg|png/
      var mimetype = filetypes.test(file.mimetype)
      var extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
      )

      if (mimetype && extname) {
        return cb(null, true)
      }

      cb(
        'Error: File upload only supports the ' +
          'following filetypes - ' +
          filetypes
      )
    },
  }).single('profile_photo')

  upload(req, res, function (err) {
    if (err) {
      console.log("ici");
      res.send(err)
    } else {
      console.log(newFileName);
      res.send({ newFileName: newFileName })
    }
  })
}

const register = async (req, res) => {
  const { name, email, password, profile_photo } = req.body;
console.log(profile_photo)
  // Validation des champs
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    const values = [email];
    const sql = `SELECT email FROM user WHERE email = ?`;
    const [result] = await pool.execute(sql, values);

    if (result.length !== 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const activationToken = await bcrypt.hash(email, 10);
    let cleanToken = activationToken.replaceAll('/', '');

    const sqlInsertRequest = 'INSERT INTO `user` (`name`, `email`, `password`, `profile_photo`, `registration_date`, `isActive`, `token`, `id_role`) VALUES (?, ?, ?, ?, NOW(), ?, ?, ? )';

    const insertValues = [name, email, hash, profile_photo, false, cleanToken, 1];

    const [rows] = await pool.execute(sqlInsertRequest, insertValues);

    if (rows.affectedRows > 0) {
      const info = await transporter.sendMail({
        from: `${process.env.SMTP_EMAIL}`,
        to: email,
        subject: 'Email activation',
        text: 'Activate your email',
        html: `<p> You need to activate your email, to access our services, please click on this link :
            <a href="http://localhost:3200/user/activate/${cleanToken}">Activate your email</a>
        </p>`,
      });

      return res.status(201).json({ success: 'registration successful' });
    } else {
      return res.status(500).json({ error: 'registration failed.' });
    }
  } catch (error) {
    console.log(error.stack);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

   // Log les valeurs reçues
   console.log("Email:", email);
   console.log("Password:", password);
  // Validation des champs de connexion
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    const sql = `SELECT * FROM user WHERE email = ?`;
    const [result] = await pool.execute(sql, [email]);

    if (result.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (!user.id_role) {
      return res.status(500).json({ error: 'User role is not defined.' });
    }

    const token = jwt.sign(
      { id: user.id_user, role: user.id_role },
      process.env.MY_SUPER_SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({ jwt: token, role: user.id_role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


const valideAccount = async (req, res) => {
  try {
    // On récupère le token présent dans le lien de l'email.
    const token = req.params.token;
    // On recherche l'utilisateur qui aurait ce token, que nous avions insérer lors 
    // de la création 
    const sql = `SELECT * FROM user WHERE token = ?`;
    const values = [token];
    const [result] = await pool.execute(sql, values);
    if (!result) {
      res.status(204).json({ error: 'Wrong credentials' });
      return;
    }
    // Si l'utilisateur ayant ce token existe, alors j'active le compte , 
    // et supprime le token car il ne me sera plus utile pour le moment
    await pool.execute(
      `UPDATE user SET isActive = 1, token = "" WHERE token = ?`,
      [token]
    );
  
    res.redirect("http://127.0.0.1:5500/Views/auth/login.html");
  } catch (error) {
    res.status(500).json({ error: error.stack });
    console.log(error.stack);
  }
}


const getAllUsers = async (req, res) => {
  try {
    const sql = `SELECT 	id_user,name  FROM user`
    const [result] = await pool.query(sql)

    res.status(201).json({ result })
    return
  } catch (error) {
    console.log(error.stack)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}


const Logout = (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        res.status(400).send('Unable to log out')
      } else {
        res.send('Logout successful')
      }
    });
  } else {
    res.end()
  }
}

const getUserProfile = async (req, res) => {
  const userId = req.params.id;
  console.log(`Fetching profile for user ID: ${userId}`);
  const sql = 'SELECT name, email, profile_photo FROM user WHERE id_user = ?';
  const [result] = await pool.execute(sql, [userId]);

  if (result.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result[0];
  const imageUrl = `http://localhost:3200/imageFile/${user.profile_photo}`;
  console.log('Image URL:', imageUrl);

  user.profile_photo = imageUrl;

  res.status(200).json(user);
};


const reset_password_request = async (req, res) => {
const { email } = req.body;
console.log(email.email);
const emailValidation = validateEmail(email.email);
if (!emailValidation.valid) {
  return res.status(400).json({ error: emailValidation.error });
}


try {
  const sql = `SELECT * FROM user WHERE email = ?`;
  const [result] = await pool.execute(sql, [email.email]);

  if (result.length === 0) {
    return res.status(200).json({ message: 'If the email is registered, a reset link will be sent.' });
  }


  const user = result[0];
  const resetToken = jwt.sign(
    { id: user.id_user },
    process.env.MY_SUPER_SECRET_KEY,
    { expiresIn: '1h' }
  );
  
  const resetLink = `http://127.0.0.1:5500/Views/auth/newpassword.html?token=${resetToken}`;

  const mailOptions = {
    from: `${process.env.SMTP_EMAIL}`,
    to: email.email,
    subject: 'Password Reset Request',
    html: `<p>You requested for a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`
  };
  
  await transporter.sendMail(mailOptions);
  
  res.status(200).json({ message: 'If the email is registered, a reset link will be sent.' });
  
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
}
};

const reset_password = async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;

  if (!token) {
    return res.status(400).send('Token manquant');
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    const decoded = jwt.verify(token, process.env.MY_SUPER_SECRET_KEY);

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `UPDATE user SET password = ? WHERE id_user = ?`;
    await pool.execute(sql, [hashedPassword, decoded.id]);

    res.status(200).json({ message: 'Password successfully reset.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(400).json({ error: 'Invalid token format.' });
    } else {
      res.status500().json({ error: 'Invalid or expired token.' });
    }
  }
};


const searchTerm = async (req, res) => {
  const searchTerm = req.query.term; // Terme de recherche
  try {
      
      const sql = `SELECT * FROM user WHERE name LIKE ? OR email LIKE ?`;
      const [results] = await pool.execute(sql, [`%${searchTerm}%`, `%${searchTerm}%`]);
      res.json(results);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur de serveur' });
  }
};



module.exports = { register, login, Logout, getAllUsers, insertProfilePicture, valideAccount, getUserProfile,reset_password_request,reset_password,searchTerm};