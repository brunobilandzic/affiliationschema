if(!window.location.href.match(/mostpopular/)){
  $(".clock").addClass("active");
  $(".fire").addClass("off");
}
else{
  $(".fire").addClass("active");
  $(".clock").addClass("off");
}

$(".sort-text.off").click((e) => {
  $(".sort-text.active").addClass("off");
  $(".sort-text.active").removeClass("active");
  e.target.classList.add("active");
  e.target.classList.remove("off");
  if(!window.location.href.match(/mostpopular/))
    window.location.href += "?mostpopular=1";
  else
    window.location.href = window.location.origin + window.location.pathname;
});
$(".like-count").on("click", (e) => {
  let _id = e.target.closest(".post-container").id;
  e.stopPropagation()
  $(".likeList." + _id).removeClass("hidden");
  $("html").on("click", () => {
    $(".likeList." + _id).addClass("hidden");
  })

});

$(".expand-comments").on("click" , (e) =>{
  let _id = e.target.closest(".comments-box").classList[0];
  e.stopPropagation();
  $(".expand-comments." + _id).addClass("hidden");
  $(".comment." + _id).removeClass("hidden");
  $(".shrink-comments."+ _id).removeClass("hidden")
})
$(".shrink-comments").on("click", (e) => {
  e.stopPropagation();
  let _id = e.target.closest(".comments-box").classList[0];
  e.stopPropagation()
  $(".expand-comments." + _id).removeClass("hidden");
  $(".comment." + _id).addClass("hidden");
  $(".shrink-comments."+ _id).addClass("hidden")
})
$(".like-icon").on("click", (e) => {
  let like = function () {
    let icon = e.target;
    let post_id = icon.closest(".post-container").id;
    if ($(icon).hasClass("far")){
      $(icon).addClass("fas");
      $(icon).removeClass("far");
      let xhr = new XMLHttpRequest();
      xhr.onload = function () {
        console.log(this.responseText);
        const newData = JSON.parse(this.responseText);
        const newListItem = "<li class=\"list-group-item\"><a class=\"user-link link \" href=\"/users/" +newData.username +"\">" + newData.username  + "</a></li>";
        $(".likeList." + post_id +" .list-group").append(newListItem);
        $(".like-count." + post_id).text(newData.count);
      }
      xhr.open("POST", "/like/" + post_id);
      xhr.send();

    }
    else if($(icon).hasClass("fas")){
      alert("In order to limit calls to database, and to perven malicous actions e.g. liking and unliking forever, unliking isn't implemented.");
    }

  }
  a(like);

});
$(".not-nav").on("click", (e)=>{
  if($(".notList")[0].classList.value.includes("hidden")){
        $(".notList").removeClass("hidden");
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/notificationseen");
        xhr.send();
  } else {
    $(".notList").addClass("hidden");
    $(".not-count").addClass("hidden");
  }
})
$(".com-btn").on("click", (e) => {
  let comment = function(){
    let xhr = new XMLHttpRequest();
    let com_box = e.target.closest(".comments-box");
    let post_id = com_box.classList[0];
    let comment_txt = $(".comment-input." + post_id).val();
    if(typeof(comment_txt)=="undefined" || comment_txt.length == 0 ) {
      alert("No empty comments please!");
      return;
    }
    xhr.onload = function () {
      const response = JSON.parse(this.responseText);
      const newComment = "<section class=\"comment\"><div class=\"comment-author\"><a class=\"user-link link\" href=\"/users/" + response.username +"\">"+ response.username + "</a></div><p class=\"comment-text\">"+comment_txt+"</p></section>";
      $(com_box).prepend(newComment);
    };
    xhr.open("POST", "/comment/" + com_box.classList[0] + "?comment=" +  comment_txt)
    xhr.send(comment_txt);
    $(".comment-input." + post_id).val("");
  }
  a(comment);
});
$(".delete-btn").on("click", (e) => {
  const post_id = e.target.closest(".post-container").id;
  if(confirm("Do you want to delete this post?")){
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/delete/" + post_id);
    xhr.send();
    $("#" + post_id).css("display", "none");
  }
  else {
    return;
  }

});

function a(callback) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/c");

  xhr.onload = function() {
    if(this.responseText === "true")
      callback();
    else if (this.responseText ==="notVerified"){
      window.location.href="/verify";
    }
    else {
      window.location.href="/log-in";
    }
  }
  xhr.send();
}
