# Go React Ripper

A simple, fast web app for extracting links from a user-supplied URL and optionally downloading them in CSV format.

# Stack

* React Native
* Golang
* Docker

# How it works
The client allows you to input the URL of a page you want to extract. A request is made to the backend, which validates the request.

The backend fetches the target URL, tokenizes the response body and then loops through it looking for well-formed \<a\> tags. For every well-formed tag it finds, it extracts the href value.

If the href is relative, the backend attempts to build it into its absolute form.

Once all links have been extracted and rebuilt, the backend immediately returns a json response containing them, and the client renders them into a table for previewing.

The client also stores the extracted link data as a Blob that can be downloaded in CSV format for ease of use.