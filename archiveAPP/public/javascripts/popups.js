function rateResource(resource){
    var popup = $(`<h1> Rate this resource </h1>
        <form id="rateForm" action="/resources/rate/${resource}" method="post">
            <select name="stars">
                <option value="1">1 star</option>
                <option value="2">2 stars</option>
                <option value="3">3 stars</option>
                <option value="4">4 stars</option>
                <option value="5">5 stars</option>
            </select>
            <button type="submit">Submit</button>
            <a href="/resources/${resource}">Cancel</a>
        </form>
    `);

    $('#display').empty();
    $('#display').append(popup);
    $('#display').modal();
}

function commentResource(resource){
    var popup = $(`<h1> Comment this resource </h1>
        <form id="commentForm" action="/resources/comment/${resource}" method="post">
            <textarea name="content" rows="4" cols="40"></textarea>
            <button type="submit">Submit</button>
            <a href="/resources/${resource}">Cancel</a>
        </form>
    `);

    $('#display').empty();
    $('#display').append(popup);
    $('#display').modal();
}
