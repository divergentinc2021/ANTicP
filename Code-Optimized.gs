// Add this optimized function to your Code.gs file

/**
 * Get repositories quickly without fetching milestone counts
 * This is much faster for initial page load
 */
function getProjectReposFast() {
  try {
    const repos = [];
    let page = 1;
    let hasMore = true;
    
    // Fetch organization repos
    while (hasMore && page <= 5) {
      const response = UrlFetchApp.fetch(
        `https://api.github.com/orgs/${ORGANIZATION}/repos?per_page=100&page=${page}&sort=updated`,
        {
          headers: {
            'Authorization': 'token ' + GITHUB_TOKEN,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const pageRepos = JSON.parse(response.getContentText());
      repos.push(...pageRepos);
      
      hasMore = pageRepos.length === 100;
      page++;
    }
    
    // Also get user's personal repos
    try {
      const userResponse = UrlFetchApp.fetch(
        `https://api.github.com/user/repos?per_page=100&sort=updated&type=owner`,
        {
          headers: {
            'Authorization': 'token ' + GITHUB_TOKEN,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const userRepos = JSON.parse(userResponse.getContentText());
      repos.push(...userRepos);
    } catch (e) {
      console.log('Could not fetch personal repos:', e);
    }
    
    // Filter and return basic info (NO milestone fetching)
    const projectRepos = repos
      .filter((repo, index, self) => index === self.findIndex(r => r.full_name === repo.full_name))
      .filter(repo => repo.has_issues && !repo.disabled && !repo.archived)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 50) // Limit to 50 most recent
      .map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        updatedAt: repo.updated_at,
        owner: repo.owner.login,
        hasIssues: repo.has_issues,
        openIssuesCount: repo.open_issues_count,
        totalMilestones: -1, // Indicates not loaded
        openMilestones: -1,
        upcomingMilestones: -1,
        isPrivate: repo.private,
        language: repo.language,
        topics: repo.topics || []
      }));
    
    return projectRepos;
  } catch (error) {
    console.error('Error fetching project repos:', error);
    return [];
  }
}

/**
 * Get milestone count for a single repository
 * Called on-demand when user selects a repo
 */
function getRepoMilestoneCount(repoFullName) {
  try {
    const milestones = getRepoMilestones(repoFullName, 'all');
    const openMilestones = milestones.filter(m => m.state === 'open').length;
    const upcomingMilestones = milestones.filter(m => 
      m.dueOn && m.state === 'open' && new Date(m.dueOn) > new Date()
    ).length;
    
    return {
      totalMilestones: milestones.length,
      openMilestones: openMilestones,
      upcomingMilestones: upcomingMilestones
    };
  } catch (error) {
    console.error('Error fetching milestone count:', error);
    return {
      totalMilestones: 0,
      openMilestones: 0,
      upcomingMilestones: 0
    };
  }
}

/**
 * Check rate limit status
 */
function checkRateLimit() {
  try {
    const response = UrlFetchApp.fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const data = JSON.parse(response.getContentText());
    const remaining = data.rate.remaining;
    const resetTime = new Date(data.rate.reset * 1000);
    
    console.log(`Rate limit: ${remaining} remaining, resets at ${resetTime}`);
    
    if (remaining < 10) {
      console.error('GitHub API rate limit nearly exhausted:', remaining);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true; // Continue anyway
  }
}

// Add this wrapper function for backward compatibility
function getAllProjectReposFast() {
  return getProjectReposFast();
}