const uiUrl = "https://dev.springrecruit.com";
const apiUrl = "https://api-dev.springrecruit.com/api/v1";
const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

chrome.runtime.onMessage.addListener(function (request, sender) {
  chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT }, function ([tab]) {
    if (request.action === "loadResume") {
      onWindowLoad()
    } else if (request.domain === "hirist.com" && request.action === "getSource") {
      fetchResumeDetails(request.source, "Hirist", true)
    } else if (request.domain === "instahyre.com" && request.action === "getSource") {
      parseImage(request.source)
    }
  });
});

function onWindowLoad() {
  chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT }, function ([tab]) {
    let file = "fetchResume/angelList.js";
    if (tab.url.includes("hirist.com")) {
      file = "fetchResume/hirist.js"
    } else if (tab.url.includes("instahyre.com")) {
      file = "fetchResume/instaHyre.js"
    }

    chrome.tabs.executeScript(tab.id, { file }, function () {
      if (chrome.runtime.lastError) {
        console.log("runtime error", chrome.runtime.lastError.message)
      }
    });

  });
}

function parseImage(images) {
  chrome.storage.sync.get('token', async function (data) {
    const { token } = data;

    if (images && images.length > 0) {
      images = images.sort((a, b) => a.page > b.page ? 1 : -1);

      const doc = await images.reduce(async (a, img) => {
        const doc1 = await a;
        if (img.page > 1) {
          doc1.addPage()
        }

        doc1.addImage(img.url, 'JPEG', 0, 0, 210, 300);
        return Promise.resolve(doc1);
      }, Promise.resolve(new jsPDF()))

      basicParse(token, doc.output('blob'))
        .then(res => {
          fetchResumeDetails(res, "Instahyre", false)
        })
        .catch(() => {
          fetchResumeDetails(null, "Instahyre", true);
        })
    } else {
      fetchResumeDetails(null, "Instahyre", true)
    }
  })
}

function fetchResumeDetails(resumeLink, addedViaExternalSource, updateResumeLink) {
  chrome.storage.sync.get('token', function (data) {
    const name = document.getElementById("srName");
    const phone = document.getElementById("srPhone");
    const email = document.getElementById("srEmail");
    const jobElem = document.getElementById("srJob");
    const stageElem = document.getElementById("srStage");
    const submitBtn = document.getElementById("srSubmit");

    let jobs = [];
    const { token } = data;

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

    if (updateResumeLink) {
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
          basicParse(token, e.target.files[0])
            .then(res => {
              resumeLink = res;
            })
            .catch(console.log)
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
    } else {
      document.getElementById("srLoader").style.display = "none";
      document.getElementById("srForm").style.display = "block";
      document.getElementById("srCandidate").style.display = "none";
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

function basicParse(token, file) {
  return new Promise((resolve, reject) => {
    const name = document.getElementById("srName");
    const phone = document.getElementById("srPhone");
    const email = document.getElementById("srEmail");

    const formData = new FormData();
    formData.append("resume", file);

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
        resolve(res && res.resumeLink);
      })
      .catch(reject)
  })
}