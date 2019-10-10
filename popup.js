const uiUrl = "https://dev.springrecruit.com";
const apiUrl = "https://api-dev.springrecruit.com/api/v1";
const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request.action === "loadResume") {
    onWindowLoad()
  } else if (request.domain === "hirist.com" && request.action === "getSource") {
    fetchResumeDetails(request.source, "Hirist")
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

function fetchResumeDetails(resumeLink, addedViaExternalSource) {
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

    fetch(`${apiUrl}/jobs-list/fakeCompany`, {
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
      const resumeBtn = document.getElementById("srResumeBtn");
      const resumeInput = document.getElementById("srResumeInput");

      resumeBtn.style.display = "block";
      document.getElementById("srLoader").style.display = "none";
      document.getElementById("srForm").style.display = "block";
      document.getElementById("srCandidate").style.display = "none";

      resumeBtn.addEventListener("click", () => {
        resumeInput.click();
      })

      resumeInput.onchange = e => {
        const formData = new FormData();
        formData.append("resume", e.target.files[0]);

        fetch(`${apiUrl}/candidate/basicResume`, {
          method: 'POST',
          headers: {
            authorization: token
          },
          body: formData
        })
          .then(res => res.json())
          .then(res => {
            res = res && res[0];
            name.value = (res && res.candidateDetail && res.candidateDetail.name && res.candidateDetail.name[0]) || '';
            phone.value = (res && res.candidateDetail && res.candidateDetail.phone && res.candidateDetail.phone[0]) || '';
            email.value = (res && res.candidateDetail && res.candidateDetail.email && res.candidateDetail.email[0]) || '';
            resumeLink = (res && res.resumeLink);
          })
          .catch(err => console.log("err", err))
      }

    } else {
      fetch(`${apiUrl}/candidate/parseResumeUrl`, {
        method: 'POST',
        body: JSON.stringify({ resumeLink }),
        headers: {
          'Content-Type': 'application/json',
          authorization: token
        }
      })
        .then(res => res.json())
        .then(res => {
          name.value = (res && res.name) || '';
          phone.value = (res && res.phone && res.phone[0]) || '';
          email.value = (res && res.email && res.email[0]) || '';
          resumeLink = (res && res.resumeLink) || resumeLink;

          document.getElementById("srLoader").style.display = "none";
          document.getElementById("srForm").style.display = "block";
          document.getElementById("srCandidate").style.display = "none";
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

      if (error) {
        submitBtn.disabled = false;
        return;
      };

      const form = [{
        name: name.value,
        phone: phone.value,
        email: email.value,
        jobId: jobElem.value,
        stageId: stageElem.value,
        candidateResumeLink: resumeLink,
        addedViaExternalSource
      }];


      fetch(`${apiUrl}/candidate/formValues`, {
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
            document.getElementById("srViewJob").addEventListener("click", () => window.open(`${uiUrl}/openings/${jobElem.value}`))
            document.getElementById("srViewCandidate").addEventListener("click", () => window.open(`${uiUrl}/candidate/${res.candidates[0].candidate._id}`))
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