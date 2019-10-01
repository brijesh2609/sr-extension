chrome.storage.sync.get('token', function (data) {
  const name = document.getElementById("srName");
  const phone = document.getElementById("srPhone");
  const email = document.getElementById("srEmail");
  const jobElem = document.getElementById("srJob");
  const stageElem = document.getElementById("srStage");
  const submitBtn = document.getElementById("srSubmit");

  let jobs = [];

  const resumeLink = "https://spring-recruit-resumes.s3.amazonaws.com/resumes/5ccf9fa168f95a001fed6521/2019/8/3/14/19/c6924ed0-ce55-11e9-8d58-e94f075dfb77.pdf";
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


  submitBtn.addEventListener('click', () => {
    const form = [{
      name: name.value,
      phone: phone.value,
      email: email.value,
      jobId: jobElem.value,
      stageId: stageElem.value,
      resumeLink
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
        window.alert('done');
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