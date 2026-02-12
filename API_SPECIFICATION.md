# API Specification for The Island of One

Base URL: `https://api.theislandofone.com` (set via `VITE_API_URL`)

## Authentication

All admin endpoints require `Authorization: Bearer <JWT>` header.

### Endpoints

#### `POST /api/auth/login`
Body: `{ email, password }` → Response: `{ token, user: { id, email, role } }`

#### `POST /api/auth/refresh`
Header: Bearer token → Response: `{ token }`

#### `GET /api/auth/me`
Header: Bearer token → Response: `{ id, email, role }`

#### `POST /api/auth/forgot-password`
Body: `{ email }` → Response: `{ message: "Reset email sent" }`

---

## File Upload

#### `POST /api/upload`
Content-Type: `multipart/form-data`, field: `file`
Response: `{ url: "https://api.theislandofone.com/uploads/filename.ext" }`

---

## Content Endpoints

### Books
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/books` | No | List all books with chapters |
| GET | `/api/books/:id` | No | Single book with chapters |
| POST | `/api/books` | Yes | Create book |
| PUT | `/api/books/:id` | Yes | Update book |
| DELETE | `/api/books/:id` | Yes | Delete book + chapters |
| PUT | `/api/books/:id/chapters` | Yes | Upsert chapters `{ chapters: [...] }` |

### Sermons
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sermons` | No | List all |
| GET | `/api/sermons/:id` | No | Single |
| POST | `/api/sermons` | Yes | Create |
| PUT | `/api/sermons/:id` | Yes | Update |
| DELETE | `/api/sermons/:id` | Yes | Delete |

### Videos
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/videos` | No | List all |
| POST | `/api/videos` | Yes | Create |
| PUT | `/api/videos/:id` | Yes | Update |
| DELETE | `/api/videos/:id` | Yes | Delete |

### Blog Posts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/blog-posts` | No | List all (query `?published=true`) |
| GET | `/api/blog-posts/by-slug/:slug` | No | Single by slug (published only) |
| POST | `/api/blog-posts` | Yes | Create |
| PUT | `/api/blog-posts/:id` | Yes | Update |
| DELETE | `/api/blog-posts/:id` | Yes | Delete |

### Hero Banners
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hero-banners` | No | List active, ordered by sort_order |
| POST | `/api/hero-banners` | Yes | Create |
| PUT | `/api/hero-banners/:id` | Yes | Update |
| DELETE | `/api/hero-banners/:id` | Yes | Delete |

### Membership Plans
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/membership-plans` | No | List all |
| PUT | `/api/membership-plans/:id` | Yes | Update |

### Graphics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/graphics` | No | List all |
| POST | `/api/graphics` | Yes | Create |
| PUT | `/api/graphics/:id` | Yes | Update |
| DELETE | `/api/graphics/:id` | Yes | Delete |

### Site Settings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/site-settings/:key` | No | Get `{ value }` |
| PUT | `/api/site-settings/:key` | Yes | Upsert `{ value }` |

### Speaking Requests
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/speaking-requests` | Yes | List all |
| POST | `/api/speaking-requests` | No | Submit new request |
| PUT | `/api/speaking-requests/:id` | Yes | Update status/notes |
| DELETE | `/api/speaking-requests/:id` | Yes | Delete |

### AI / Proxy Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai-writing` | Yes | Proxy to OpenAI/Gemini |
| POST | `/api/text-to-speech` | Yes | Proxy to ElevenLabs |
| POST | `/api/parse-pdf` | Yes | AI-powered PDF parsing |

---

## MySQL Schema

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  role ENUM('admin','moderator','user') NOT NULL,
  UNIQUE KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE books (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT DEFAULT '',
  author VARCHAR(255) DEFAULT 'Bryant Clark',
  description TEXT DEFAULT '',
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  category VARCHAR(100) DEFAULT 'Faith',
  cover_image TEXT DEFAULT '',
  featured BOOLEAN DEFAULT FALSE,
  audio_url TEXT NULL,
  pdf_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE book_chapters (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  book_id CHAR(36) NOT NULL,
  title TEXT DEFAULT '',
  content LONGTEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE sermons (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  scripture TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  manuscript LONGTEXT DEFAULT '',
  access_level VARCHAR(50) DEFAULT 'free',
  date DATE DEFAULT (CURRENT_DATE),
  category VARCHAR(100) DEFAULT 'Faith',
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  preview_cutoff INT DEFAULT 2,
  featured BOOLEAN DEFAULT FALSE,
  audio_url TEXT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE videos (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  thumbnail TEXT DEFAULT '',
  duration VARCHAR(20) DEFAULT '0:00',
  category VARCHAR(100) DEFAULT 'Ministry',
  youtube_url TEXT DEFAULT '',
  featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE blog_posts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  author VARCHAR(255) DEFAULT '',
  excerpt TEXT DEFAULT '',
  content LONGTEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE hero_banners (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) DEFAULT '',
  subtitle TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  cta_text VARCHAR(255) DEFAULT 'Explore Books',
  cta_link VARCHAR(255) DEFAULT '/books',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE membership_plans (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  features JSON DEFAULT ('[]'),
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE graphics (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(100) DEFAULT 'General',
  price DECIMAL(10,2) DEFAULT 0,
  preview_url TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE speaking_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NULL,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_location VARCHAR(255) NULL,
  topic VARCHAR(255) NULL,
  message TEXT NULL,
  status VARCHAR(50) DEFAULT 'new',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE site_settings (
  `key` VARCHAR(255) PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## JWT Middleware Pattern (Express)

```js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}
```

## File Upload (multer)

```js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/upload', authMiddleware, adminOnly, upload.single('file'), (req, res) => {
  const url = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
  res.json({ url });
});

// Serve static uploads
app.use('/uploads', express.static('uploads'));
```
