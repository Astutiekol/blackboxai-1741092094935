-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for storing wallet information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lottery pools table
CREATE TABLE lottery_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_address VARCHAR(44) UNIQUE NOT NULL,
    creator_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    ticket_price DECIMAL(18, 9) NOT NULL, -- SOL amount with 9 decimals
    min_players INTEGER NOT NULL,
    max_players INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, completed, cancelled
    winner_id UUID REFERENCES users(id),
    prize_amount DECIMAL(18, 9), -- SOL amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ticket transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID REFERENCES lottery_pools(id),
    user_id UUID REFERENCES users(id),
    signature VARCHAR(88) NOT NULL UNIQUE, -- Solana transaction signature
    amount DECIMAL(18, 9) NOT NULL, -- SOL amount
    type VARCHAR(20) NOT NULL, -- purchase, refund, prize
    status VARCHAR(20) NOT NULL, -- pending, confirmed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID REFERENCES lottery_pools(id),
    user_id UUID REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),
    ticket_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, drawn, won, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_pools_status ON lottery_pools(status);
CREATE INDEX idx_pools_dates ON lottery_pools(start_time, end_time);
CREATE INDEX idx_transactions_signature ON transactions(signature);
CREATE INDEX idx_tickets_pool_user ON tickets(pool_id, user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_lottery_pools_updated_at
    BEFORE UPDATE ON lottery_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views
CREATE VIEW active_pools AS
SELECT 
    lp.*,
    COUNT(DISTINCT t.user_id) as current_players,
    SUM(tr.amount) as current_pool_amount
FROM lottery_pools lp
LEFT JOIN tickets t ON t.pool_id = lp.id
LEFT JOIN transactions tr ON tr.pool_id = lp.id AND tr.status = 'confirmed'
WHERE lp.status = 'active'
GROUP BY lp.id;
