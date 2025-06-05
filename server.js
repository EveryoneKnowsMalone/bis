require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/btc-investment', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    btcAmount: { type: Number, default: 0 },
    transactions: [{
        type: { type: String, enum: ['deposit', 'withdraw', 'buy', 'sell'] },
        amount: Number,
        btcAmount: Number,
        price: Number,
        date: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Protected routes
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

app.post('/api/deposit', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.userId);

        user.balance += amount;
        user.transactions.push({
            type: 'deposit',
            amount,
            date: new Date()
        });

        await user.save();
        res.json({ balance: user.balance });
    } catch (error) {
        res.status(500).json({ message: 'Error processing deposit' });
    }
});

app.post('/api/withdraw', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.userId);

        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        user.balance -= amount;
        user.transactions.push({
            type: 'withdraw',
            amount,
            date: new Date()
        });

        await user.save();
        res.json({ balance: user.balance });
    } catch (error) {
        res.status(500).json({ message: 'Error processing withdrawal' });
    }
});

app.post('/api/buy-btc', authenticateToken, async (req, res) => {
    try {
        const { amount, btcPrice } = req.body;
        const user = await User.findById(req.user.userId);

        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        const btcAmount = amount / btcPrice;
        user.balance -= amount;
        user.btcAmount += btcAmount;
        user.transactions.push({
            type: 'buy',
            amount,
            btcAmount,
            price: btcPrice,
            date: new Date()
        });

        await user.save();
        res.json({
            balance: user.balance,
            btcAmount: user.btcAmount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing BTC purchase' });
    }
});

app.post('/api/sell-btc', authenticateToken, async (req, res) => {
    try {
        const { btcAmount, btcPrice } = req.body;
        const user = await User.findById(req.user.userId);

        if (user.btcAmount < btcAmount) {
            return res.status(400).json({ message: 'Insufficient BTC' });
        }

        const amount = btcAmount * btcPrice;
        user.balance += amount;
        user.btcAmount -= btcAmount;
        user.transactions.push({
            type: 'sell',
            amount,
            btcAmount,
            price: btcPrice,
            date: new Date()
        });

        await user.save();
        res.json({
            balance: user.balance,
            btcAmount: user.btcAmount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing BTC sale' });
    }
});

// Get user transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json(user.transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 