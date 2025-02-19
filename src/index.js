let profilePic = document.getElementById("profile-pic");
let container = document.getElementById("container");
profilePic.style.left = `${container.offsetLeft + 20}px`;
profilePic.style.top = `${container.offsetTop}px`;

//https://stackoverflow.com/questions/6108819/javascript-timestamp-to-relative-time
var units = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: 24 * 60 * 60 * 1000 * 365 / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000
}

var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

var getRelativeTime = (d1, d2 = new Date()) => {
    var elapsed = d1 - d2

    // "Math.abs" accounts for both "past" & "future" scenarios
    for (var u in units)
        if (Math.abs(elapsed) > units[u] || u == 'second')
            return rtf.format(Math.round(elapsed / units[u]), u)
}

async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');    
    return hashHex;
}

async function hashToImage(name) {
    const hash = await hashText(name);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 5;
    const cellSize = 20;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    let binaryString = '';

    for (let i = 0; i < hash.length; i++) {
        const binary = parseInt(hash[i], 16).toString(2).padStart(4, '0');        
        binaryString += binary;
    }    
    
    for (let row = 0; row < 5; row++) {
        const gridRow = [];
        for (let col = 0; col < 3; col++) {
            gridRow.push(binaryString[row * 3 + col] === '1' ? 1 : 0);
            if (gridRow[col] === 1) {
                ctx.fillStyle = 'black';
            } else {
                ctx.fillStyle = 'white';
            }
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
        console.log([...gridRow, gridRow[1], gridRow[0]]);
        
        if (gridRow[1] === 1) {
            ctx.fillStyle = 'black';
        } else {
            ctx.fillStyle = 'white';
        }
        ctx.fillRect(3 * cellSize, row * cellSize, cellSize, cellSize);
        if (gridRow[0] === 1) {
            ctx.fillStyle = 'black';
        } else {
            ctx.fillStyle = 'white';
        }
        ctx.fillRect(4 * cellSize, row * cellSize, cellSize, cellSize);
    }
    return canvas.toDataURL();
}


async function getRecentlyPlayedSong() {
    const response = await fetch("https://www.api.ritt.in/last-played-song");
    let data = await response.json();
    let playing = false;
    const playerData = {};
    playerData.played_at = getRelativeTime(new Date(data.items[0].played_at));
    playerData.name = data.items[0].track.name;
    playerData.image = data.items[0].track.album.images[2].url;
    playerData.audioPreview = data.items[0].track.preview_url;
    playerData.url = data.items[0].track.external_urls.spotify;
    const spotifyCard = document.getElementById("spotify-card");
    spotifyCard.getElementsByTagName("p")[0].innerText = playerData.name;
    spotifyCard.getElementsByTagName("img")[0].src = playerData.image;
    spotifyCard.getElementsByClassName("last-played")[0].innerText = playerData.played_at;

    const audioPreview = new Audio(playerData.audioPreview);
    audioPreview.volume = 0.1;

    spotifyCard.onclick = () => {
        playing = !playing;
        playing ? audioPreview.play() : audioPreview.pause();
        if (playing) {
            spotifyCard.setAttribute("data-playing", "true");
        } else {
            spotifyCard.setAttribute("data-playing", "false");
        }
    }
}

// async function getRecentlyPlayedMovie() {
//     const response = await fetch("https://www.api.ritt.in/last-played-movie");
//     let data = await response.json();

//     const movieCard = document.getElementById("movie-card");
//     movieCard.getElementsByTagName("p")[0].innerText = data.name;
//     movieCard.getElementsByTagName("img")[0].src = data.posterImg;
//     movieCard.getElementsByClassName("last-played")[0].innerText = `Last Played ${getRelativeTime(new Date(data.lastPlayedDate))}`;
//     movieCard.getElementsByClassName("rating")[0].innerText = `⭐ ${parseFloat(data.rating).toFixed(1)}`;
// }

async function getProjectDetails() {
    try {
        const response = await fetch(
            "https://api.github.com/users/aurora-0025/repos?page=1&per_page=100"
        );
        /**
         * @type Repository[]
         */
        let data = await response.json();
        data.sort(
            (repo1, repo2) => new Date(repo2.created_at) - new Date(repo1.created_at)
        );

        let filtered_repos = [];

        for await (const repo of data) {
            const details = {
                default_branch: repo.default_branch,
                name: repo.name,
                desc: repo.description || "No Description Provided",
                date_created: repo.created_at,
                website: repo.homepage || null,
                github_url: repo.git_url.replace("git://", "https://www.").slice(0, -4)
                // image: imgTags ? imgTags[0].slice(5, -1) : null,
            };
            filtered_repos.push(details);
        }
        return filtered_repos;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function fetchProjectImage(name, branch) {
    try {
        const response = await fetch(
            `https://raw.githubusercontent.com/aurora-0025/${name}/${branch}/README.md`
        );
        const imgTagRegex = /src="https:\/\/.*?"/;
        const imgTags = (await response.text()).match(imgTagRegex);
        return imgTags ? imgTags[0].slice(5, -1) : await hashToImage(name);
    } catch (error) {
        // console.log(error);
        return await hashToImage(name);
    }

}

function lazyLoadImage(name, branch, imgElement, projectDiv) {
    fetchProjectImage(name, branch).then((imageUrl) => {
        if (imageUrl) {            
            imgElement.src = imageUrl;
            imgElement.classList.add("loaded")
        } else {
            imgElement.classList.add("not-loaded")
        }
    });
}

function showMoreProjects() {
    var listData = Array.prototype.slice.call(document.querySelectorAll('#projects-container li:not(.shown)')).slice(0, 3);

    for (var i = 0; i < listData.length; i++) {
        listData[i].className = 'project shown';
    }
    switchButtons();
}

function showLessProjects() {
    var listData = Array.prototype.slice.call(document.querySelectorAll('#projects-container li:not(.hidden)')).slice(-3);
    for (var i = 0; i < listData.length; i++) {
        listData[i].className = 'project hidden';
    }
    switchButtons();
}

function switchButtons() {
    var hiddenElements = Array.prototype.slice.call(document.querySelectorAll('#projects-container li:not(.shown)'));
    if (hiddenElements.length == 0) {
        document.getElementById('moreButton').style.display = 'none';
    }
    else {
        document.getElementById('moreButton').style.display = 'block';
    }

    var shownElements = Array.prototype.slice.call(document.querySelectorAll('#projects-container li:not(.hidden)'));
    if (shownElements.length == 0) {
        document.getElementById('lessButton').style.display = 'none';
    }
    else {
        document.getElementById('lessButton').style.display = 'block';
    }
}

getProjectDetails().then((details) => {
    details.forEach((project, i) => {
        const container = document.getElementById("projects-container");
        const projectDiv = document.createElement("li");
        projectDiv.classList.add("project");
        if (i > 2) projectDiv.classList.add("hidden");
        else projectDiv.classList.add("shown");
        projectDiv.style = `opacity:0; display:none; animation-name: fadeIn; animation-duration: 0.5s; animation-delay: ${i%3 * 0.1}s; animation-fill-mode:forwards`
        projectDiv.innerHTML = `
                <img src="" alt="${project.name} logo"></img>
                <div class="project-details">
                    <div class="project-name">
                        <h3>${project.name}</h3>
                    </div>
                    <div class="project-date">
                        <p>${new Date(project.date_created).getFullYear()}</p>
                    </div>
                    <div class="links">
                        ${project.github_url ? `<a class="github" target="_blank" href="${project.github_url}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
</svg></a>` : ''}
                        ${project.website ? `<a class="website" target="_blank" href="${project.website}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
  <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
  <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
</svg></a>` : ''}
                    <div/>
                </div>
        `

        let projectImage = projectDiv.getElementsByTagName("img")[0];
        container.appendChild(projectDiv);
        lazyLoadImage(project.name, project.default_branch, projectImage, projectDiv);
    })
})
getRecentlyPlayedSong();
getRecentlyPlayedMovie();

window.addEventListener("resize", () => {
    profilePic.style.left = `${container.offsetLeft + 20}px`;
    profilePic.style.top = `${container.offsetTop}px`;
})

// profilePic.addEventListener("animationstart", () => {
//     window.location.href = "https://github.com/aurora-0025";
// })

// profilePic.addEventListener("click", (e) => {
//     profilePic.style.borderRadius = "0"
//     profilePic.classList.add("openAnimation");
// });

// profilePic.addEventListener("animationend", () => {
//     profilePic.style.borderRadius = "50%"
//     profilePic.classList.remove("openAnimation");
// })

/**
 * @typedef {Object} Repository
 * @property {number} id - The unique identifier of the repository.
 * @property {string} node_id - The node ID of the repository.
 * @property {string} name - The name of the repository.
 * @property {string} full_name - The full name of the repository, including the owner's name.
 * @property {boolean} private - Indicates if the repository is private.
 * @property {Owner} owner - The owner of the repository.
 * @property {string} html_url - The HTML URL of the repository.
 * @property {string} description - The description of the repository.
 * @property {boolean} fork - Indicates if the repository is a fork.
 * @property {string} url - The API URL of the repository.
 * @property {string} forks_url - The URL to get the list of forks of the repository.
 * @property {string} keys_url - The URL to get the list of deploy keys of the repository.
 * @property {string} collaborators_url - The URL to get the list of collaborators of the repository.
 * @property {string} teams_url - The URL to get the list of teams with access to the repository.
 * @property {string} hooks_url - The URL to get the list of webhooks of the repository.
 * @property {string} issue_events_url - The URL to get the list of issue events of the repository.
 * @property {string} events_url - The URL to get the list of repository events.
 * @property {string} assignees_url - The URL to get the list of assignees of the repository.
 * @property {string} branches_url - The URL to get the list of branches of the repository.
 * @property {string} tags_url - The URL to get the list of tags of the repository.
 * @property {string} blobs_url - The URL to get the blobs of the repository.
 * @property {string} git_tags_url - The URL to get the Git tags of the repository.
 * @property {string} git_refs_url - The URL to get the Git references of the repository.
 * @property {string} trees_url - The URL to get the trees of the repository.
 * @property {string} statuses_url - The URL to get the statuses of the repository.
 * @property {string} languages_url - The URL to get the languages used in the repository.
 * @property {string} stargazers_url - The URL to get the list of stargazers of the repository.
 * @property {string} contributors_url - The URL to get the list of contributors of the repository.
 * @property {string} subscribers_url - The URL to get the list of subscribers of the repository.
 * @property {string} subscription_url - The URL to manage the subscription of the repository.
 * @property {string} commits_url - The URL to get the commits of the repository.
 * @property {string} git_commits_url - The URL to get the Git commits of the repository.
 * @property {string} comments_url - The URL to get the comments of the repository.
 * @property {string} issue_comment_url - The URL to get the issue comments of the repository.
 * @property {string} contents_url - The URL to get the contents of the repository.
 * @property {string} compare_url - The URL to compare changes between two commits in the repository.
 * @property {string} merges_url - The URL to get the list of merge requests of the repository.
 * @property {string} archive_url - The URL to download the repository as an archive.
 * @property {string} downloads_url - The URL to get the list of downloads of the repository.
 * @property {string} issues_url - The URL to get the list of issues of the repository.
 * @property {string} pulls_url - The URL to get the list of pull requests of the repository.
 * @property {string} milestones_url - The URL to get the list of milestones of the repository.
 * @property {string} notifications_url - The URL to get the notifications of the repository.
 * @property {string} labels_url - The URL to get the list of labels of the repository.
 * @property {string} releases_url - The URL to get the list of releases of the repository.
 * @property {string} deployments_url - The URL to get the list of deployments of the repository.
 * @property {string} created_at - The creation date of the repository in ISO format.
 * @property {string} updated_at - The last update date of the repository in ISO format.
 * @property {string} pushed_at - The last push date of the repository in ISO format.
 * @property {string} git_url - The Git URL of the repository.
 * @property {string} ssh_url - The SSH URL of the repository.
 * @property {string} clone_url - The clone URL of the repository.
 * @property {string} svn_url - The SVN URL of the repository.
 * @property {string} homepage - The homepage URL of the repository.
 * @property {number} size - The size of the repository in kilobytes.
 * @property {number} stargazers_count - The number of stargazers of the repository.
 * @property {number} watchers_count - The number of watchers of the repository.
 * @property {string|null} language - The primary programming language of the repository.
 * @property {boolean} has_issues - Indicates if the repository has issues enabled.
 * @property {boolean} has_projects - Indicates if the repository has projects enabled.
 * @property {boolean} has_downloads - Indicates if the repository has downloads enabled.
 * @property {boolean} has_wiki - Indicates if the repository has a wiki enabled.
 * @property {boolean} has_pages - Indicates if the repository has GitHub Pages enabled.
 * @property {boolean} has_discussions - Indicates if the repository has discussions enabled.
 * @property {number} forks_count - The number of forks of the repository.
 * @property {string|null} mirror_url - The mirror URL of the repository.
 * @property {boolean} archived - Indicates if the repository is archived.
 * @property {boolean} disabled - Indicates if the repository is disabled.
 * @property {number} open_issues_count - The number of open issues in the repository.
 * @property {Object|null} license - The license information of the repository.
 * @property {boolean} allow_forking - Indicates if forking is allowed for the repository.
 * @property {boolean} is_template - Indicates if the repository is a template.
 * @property {boolean} web_commit_signoff_required - Indicates if web commit sign-off is required.
 * @property {Array<string>} topics - The list of topics associated with the repository.
 * @property {string} visibility - The visibility of the repository (e.g., "public").
 * @property {number} forks - The number of forks of the repository.
 * @property {number} open_issues - The number of open issues in the repository.
 * @property {number} watchers - The number of watchers of the repository.
 * @property {string} default_branch - The default branch of the repository.
 */

/**
 * @typedef {Object} Owner
 * @property {string} login - The username of the repository owner.
 * @property {number} id - The unique identifier of the owner.
 * @property {string} node_id - The node ID of the owner.
 * @property {string} avatar_url - The avatar URL of the owner.
 * @property {string} gravatar_id - The Gravatar ID of the owner (if any).
 * @property {string} url - The API URL of the owner.
 * @property {string} html_url - The HTML URL of the owner's profile.
 * @property {string} followers_url - The URL to get the list of followers of the owner.
 * @property {string} following_url - The URL to get the list of users the owner is following.
 * @property {string} gists_url - The URL to get the list of gists of the owner.
 * @property {string} starred_url - The URL to get the list of starred repositories by the owner.
 * @property {string} subscriptions_url - The URL to get the list of subscriptions of the owner.
 * @property {string} organizations_url - The URL to get the list of organizations of the owner.
 * @property {string} repos_url - The URL to get the list of repositories of the owner.
 * @property {string} events_url - The URL to get the list of events of the owner.
 * @property {string} received_events_url - The URL to get the list of events received by the owner.
 * @property {string} type - The type of the owner (e.g., "User" or "Organization").
 * @property {boolean} site_admin - Indicates if the owner is a site admin.
 */
