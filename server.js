import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import cors from 'cors';
import nodemailer from 'nodemailer';

// Initialize app and middleware
const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/userDetails')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true },
  password: { type: String, required: true },
});

const FormSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
});

// Define models
const User = mongoose.model('User', UserSchema);
const Form = mongoose.model('Form', FormSchema);

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sanjayaadhith.ee19@bitsathy.ac.in',
    pass: 'zenk gqqi okac pimw',
  },
});

async function sendEmail(to, subject, htmlContent) {
  try {
    const info = await transporter.sendMail({
      from: '"Gas Booking Service" <sanjayaadhith.ee19@bitsathy.ac.in>', // sender address
      to, // receiver email
      subject, // Subject line
      html: htmlContent, // html body
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Registration endpoint
app.post('/register', async (req, res) => {
  const { username, email, phoneNo, password } = req.body;

  if (!password) {
    return res.status(400).send('Password is required');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    email,
    phoneNo,
    password: hashedPassword,
  });

  try {
    await user.save();
    res.status(201).send('User registered');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(400).send('User not found');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).send('Invalid credentials');
  }

  res.send('Login successful');
});

// Save form data endpoint
app.post('/gasBookingForm', async (req, res) => {
  console.log('Request body:', req.body);  // Log the request body
  const form = new Form(req.body);
  try {
    await form.save();
    // Send booking confirmation email
    const subject = 'Gas Booking Confirmation';
    const htmlContent = `
      <h3>Booking Confirmed</h3>
      <p>Your gas booking is confirmed for ${form.date} at ${form.timeSlot}.</p>
    `;
    await sendEmail(form.email, subject, htmlContent);
    res.status(201).send('Form data saved and email sent');
  } catch (err) {
    console.error('Error saving form data:', err);  // Log the error
    res.status(400).send(err.message);
  }
});
app.get('/gasBookingForm', async (req, res) => {
  try {
    const forms = await Form.find({});
    res.json(forms);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Get form data by ID endpoint
app.get('/gasBookingForm/:id', async (req, res) => {
  console.log('Fetching form data with ID:', req.params.id);  // Log the ID being fetched
  try {
    const form = await Form.findOne({ id: req.params.id });  // Adjust the query to use custom id
    if (!form) {
      return res.status(404).send('Form data not found');
    }
    res.json(form);
  } catch (err) {
    console.error('Error fetching form data:', err);  // Log the error
    res.status(400).send(err.message);
  }
});

// Update form data by ID endpoint
app.put('/gasBookingForm/:id', async (req, res) => {
  console.log('Updating form data with ID:', req.params.id);  // Log the ID being updated
  try {
    const form = await Form.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true });
    if (!form) {
      return res.status(404).send('Form data not found');
    }
    // Send update confirmation email
    const subject = 'Gas Booking Updated';
    const htmlContent = `
      <h3>Booking Updated</h3>
      <p>Your gas booking has been updated to ${form.date} at ${form.timeSlot}.</p>
    `;
    await sendEmail(form.email, subject, htmlContent);
    res.json(form);
  } catch (err) {
    console.error('Error updating form data:', err);  // Log the error
    res.status(400).send(err.message);
  }
});

// Delete form data endpoint
app.delete('/gasBookingForm/:id', async (req, res) => {
  try {
    const form = await Form.findOneAndDelete({ id: req.params.id });
    if (!form) {
      return res.status(404).send('Form data not found');
    }
    // Send deletion confirmation email
    const subject = 'Gas Booking Cancelled';
    const htmlContent = `
      <h3>Booking Cancelled</h3>
      <p>Your gas booking scheduled for ${form.date} at ${form.timeSlot} has been cancelled.</p>
    `;
    await sendEmail(form.email, subject, htmlContent);
    res.send('Form data deleted and email sent');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
