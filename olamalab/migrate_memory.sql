USE olamalab;

CREATE TABLE IF NOT EXISTS conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source ENUM('local', 'api') NOT NULL DEFAULT 'local',
    title VARCHAR(255) NOT NULL DEFAULT 'New conversation',
    model VARCHAR(64) NOT NULL DEFAULT 'llama3.2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source_updated (source, updated_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id, id)
) ENGINE=InnoDB;

ALTER TABLE prompts_log
    ADD COLUMN IF NOT EXISTS conversation_id INT UNSIGNED NULL AFTER id,
    ADD COLUMN IF NOT EXISTS message_id INT UNSIGNED NULL AFTER conversation_id;
