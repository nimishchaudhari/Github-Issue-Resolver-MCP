// Middleware for json-server to mimic GitHub API behavior
module.exports = (req, res, next) => {
  // Get single repository
  if (req.method === 'GET' && req.path.match(/^\/repos\/[^\/]+\/[^\/]+$/)) {
    const parts = req.path.split('/');
    const owner = parts[2];
    const repo = parts[3];
    
    const db = req.app.db;
    const repository = db.get('repos').find({ owner, repo }).value();
    
    if (repository) {
      return res.json(repository);
    } else {
      return res.status(404).json({ message: 'Repository not found' });
    }
  }
  
  // Creating a pull request
  if (req.method === 'POST' && req.path.match(/^\/repos\/[^\/]+\/[^\/]+\/pulls$/)) {
    const parts = req.path.split('/');
    const owner = parts[2];
    const repo = parts[3];
    
    const pullRequest = {
      id: Date.now(),
      number: Math.floor(Math.random() * 1000) + 1,
      title: req.body.title,
      body: req.body.body,
      html_url: `https://github.com/${owner}/${repo}/pull/${Math.floor(Math.random() * 1000) + 1}`,
      head: req.body.head,
      base: req.body.base,
      state: 'open',
      created_at: new Date().toISOString()
    };
    
    const db = req.app.db;
    db.get('pullRequests').push(pullRequest).write();
    
    return res.status(201).json(pullRequest);
  }
  
  // Creating a comment
  if (req.method === 'POST' && req.path.match(/^\/repos\/[^\/]+\/[^\/]+\/issues\/\d+\/comments$/)) {
    const parts = req.path.split('/');
    const owner = parts[2];
    const repo = parts[3];
    const issueNumber = parseInt(parts[5], 10);
    
    const comment = {
      id: Date.now(),
      issue_number: issueNumber,
      owner,
      repo,
      body: req.body.body,
      html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}#issuecomment-${Date.now()}`
    };
    
    const db = req.app.db;
    db.get('comments').push(comment).write();
    
    return res.status(201).json(comment);
  }
  
  // Handle file content decoding
  if (req.method === 'GET' && req.path.includes('/contents/')) {
    const result = res.locals.data;
    
    if (result && result.content && !req.query._raw) {
      // Base64 decode the content if it exists
      try {
        const content = Buffer.from(result.content, 'base64').toString('utf-8');
        result.decoded_content = content;
      } catch (error) {
        console.error('Error decoding content:', error);
      }
    }
  }

  next();
};
