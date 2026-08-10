
CREATE TABLE conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source ENUM('local', 'api') NOT NULL DEFAULT 'local',
    title VARCHAR(255) NOT NULL DEFAULT 'New conversation',
    model VARCHAR(64) NOT NULL DEFAULT 'llama3.2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source_updated (source, updated_at DESC)
) ENGINE=InnoDB;

CREATE TABLE  messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id, id)
) ENGINE=InnoDB;

CREATE TABLE  prompts_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NULL,
    message_id INT UNSIGNED NULL,
    source ENUM('local', 'api') NOT NULL DEFAULT 'api',
    model VARCHAR(64) NOT NULL DEFAULT 'llama3.2',
    prompt TEXT NOT NULL,
    request_payload JSON NOT NULL,
    response_text TEXT,
    response_raw JSON,
    client_ip VARCHAR(45),
    user_agent VARCHAR(512),
    duration_ms INT UNSIGNED,
    status ENUM('ok', 'error') NOT NULL DEFAULT 'ok',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source (source),
    INDEX idx_conversation (conversation_id),
    INDEX idx_created (created_at DESC),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB;
