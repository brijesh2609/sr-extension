const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request.domain === "hirist.com" && request.action === "getSource") {
    fetchResumeDetails(request.source)
  }
});

function onWindowLoad() {
  chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT }, function ([tab]) {
    let file = "getPagesSource.js";
    if (tab.url.includes("hirist.com")) {
      file = "getHiristResume.js"
    }

    chrome.tabs.executeScript(null, { file }, function () {
      // If you try and inject into an extensions page or the webstore/NTP you'll get an error
      if (chrome.runtime.lastError) {
        console.log("runtime error", chrome.runtime.lastError.message)
      }
    });

  });
}

window.onload = onWindowLoad;

function fetchResumeDetails(resumeLink) {
  chrome.storage.sync.get('token', function (data) {
    const name = document.getElementById("srName");
    const phone = document.getElementById("srPhone");
    const email = document.getElementById("srEmail");
    const jobElem = document.getElementById("srJob");
    const stageElem = document.getElementById("srStage");
    const submitBtn = document.getElementById("srSubmit");

    let jobs = [];
    let { token } = data;
    token = token.replace('Bearer%20', 'Bearer ');

    fetch('http://localhost:8080/api/v1/jobs-list/fakeCompany', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        authorization: token
      }
    })
      .then(res => res.json())
      .then(res => {
        jobs = res.jobs;
        res.jobs
          .filter(job => job.status && Boolean(job.stages.length))
          .forEach((job, index) => {
            const opt = document.createElement('option');
            opt.appendChild(document.createTextNode(job.jobTitle));
            opt.value = job._id;
            jobElem.appendChild(opt);


            if (index === 1) {
              job.stages
                .filter(stage => stage.status)
                .forEach(stage => {
                  const opt = document.createElement('option');
                  opt.appendChild(document.createTextNode(stage.stageName));
                  opt.value = stage._id;
                  stageElem.appendChild(opt);
                })
            }
          })
      })
      .catch(err => console.log("err", err))

    if (!resumeLink) {
      document.getElementById("srLoader").style.display = "none";
      document.getElementById("srForm").style.display = "block";
    } else {
      fetch('http://localhost:8080/api/v1/candidate/parseResumeUrl', {
        method: 'POST',
        body: JSON.stringify({ resumeLink }),
        headers: {
          'Content-Type': 'application/json',
          authorization: token
        }
      })
        .then(res => res.json())
        .then(res => {
          name.value = res.name;
          phone.value = res.phone[0];
          email.value = res.email[0];

          document.getElementById("srLoader").style.display = "none";
          document.getElementById("srForm").style.display = "block";
        })
        .catch(err => console.log("err", err))
    }


    submitBtn.addEventListener('click', () => {
      document.getElementById("srError").style.display = "none";
      name.style.borderColor = "#d9d9d9";
      email.style.borderColor = "#d9d9d9";
      phone.style.borderColor = "#d9d9d9";
      submitBtn.disabled = true;
      let error = false;

      if (!name.value) {
        name.style.borderColor = "red";
        error = true;
      }

      if (!phone.value) {
        phone.style.borderColor = "red";
        error = true;
      }

      if (!(email.value && emailRegExp.test(email.value))) {
        email.style.borderColor = "red";
        error = true;
      }

      if (error) return;

      const form = [{
        name: name.value,
        phone: phone.value,
        email: email.value,
        jobId: jobElem.value,
        stageId: stageElem.value,
        candidateResumeLink: resumeLink
      }];


      fetch('http://localhost:8080/api/v1/candidate/formValues', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: {
          'Content-Type': 'application/json',
          authorization: token
        }
      })
        .then(res => res.json())
        .then(res => {
          submitBtn.disabled = false;
          if (res.duplicates.length) {
            document.getElementById("srError").style.display = "block";
          } else {
            document.getElementById("srCandidateText").innerText = `${name.value} has been added to the job.`;
            document.getElementById("srCandidate").style.display = "block";
            document.getElementById("srForm").style.display = "none";
            document.getElementById("srViewJob").addEventListener("click", () => window.open(`http://localhost:3000/openings/${jobElem.value}`))
            document.getElementById("srViewCandidate").addEventListener("click", () => window.open(`http://localhost:3000/candidate/${res.candidates[0].candidate._id}`))
          }
        })
        .catch(err => window.alert(err.message))
    })

    jobElem.addEventListener('change', event => {
      for (i = 0; i <= stageElem.options.length; i++) {
        stageElem.options[i] = null;
      }

      const job = jobs.find(j => j._id === event.target.value);
      job.stages
        .filter(stage => stage.status)
        .forEach(stage => {
          const opt = document.createElement('option');
          opt.appendChild(document.createTextNode(stage.stageName));
          opt.value = stage._id;
          stageElem.appendChild(opt);
        })
    });
  });
}