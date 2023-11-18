const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");

const BlogPost = require("../models/blog_post/blog_post");
const PostContent = require("../models/blog_post/post_content");
const ContentImage = require("../models/blog_post/content_image");

const firebaseStorage = require("../config/firebase");
const { ref, getDownloadURL } = require("firebase/storage");

// Blog Post
exports.getAllBlogPosts = async (req, res, next) => {
    let options = {};
    
    let total = BlogPost.countDocuments(options);
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || parseInt(await total);
    let last_page = Math.ceil(parseInt(await total)/limit);
    if (last_page < 1 && total > 0) {
        last_page = 1
    }

    try {
        const blogPosts = await BlogPost.find(options);
        res.status(200).json({
            success: true,
            message: "List of blog posts fetched successfully",
            data: blogPosts,
            total: (await total).toString(),
            page: (await page).toString(),
            last_page: (await last_page).toString()
        });
    } catch (error) {
        next(error);
    }
};

exports.getBlogPostById = async (req, res, next) => {
    const { blogPostId } = req.params;

    if (!blogPostId || !mongoose.Types.ObjectId.isValid(blogPostId))
        return next(new ErrorResponse("Please provide valid blog post's ID", 400));

    try {
        const blogPost = await BlogPost.findById(blogPostId);

        if (!blogPost)
            return next(new ErrorResponse("No blog post found", 404));
        
        res.status(200).json({
            success: true,
            data: blogPost
        });
    } catch (error) {
        next(error);
    }
};

exports.createBlogPost = async (req, res, next) => {
    const { blogPostTitle, blogPostTag, blogPostDescription } = req.body;

    try {
        await BlogPost.create({
            blogPostTitle,
            blogPostTag,
            blogPostDescription
        });

        res.status(201).json({
            success: true,
            message: "Blog post created successfully"
        });
    } catch (error) {
        next(error);
    }
};

exports.saveBlogPostThumbnail = async (req, res, next) => {
    const { blogPostId } = req.params;

    if (!blogPostId || !mongoose.Types.ObjectId.isValid(blogPostId)) {
        return next(new ErrorResponse("Please provide valid blog post's ID", 400));
    }

    try {
        const blogPost = await BlogPost.findById(blogPostId);

        if (!blogPost)
            return next(new ErrorResponse("No blog post found", 404));

        const thumbnailURL = await getDownloadURL(ref(firebaseStorage, `attachments/${req.thumbnailOriginalName}`))

        await blogPost.updateOne({
            blogPostThumbnail: thumbnailURL
        });

        await blogPost.save();

        res.status(200).json({
            success: true,
            message: "Blog post's thumbnail saved successfully"
        });
    } catch (error) {
        next(error);
    }
};

exports.hideOrUnhideBlogPost = async (req, res, next) => {
    const { blogPostId } = req.params;

    if (!blogPostId || !mongoose.Types.ObjectId.isValid(blogPostId)) {
        return next(new ErrorResponse("Please provide valid blog post's ID", 400));
    }

    try {
        const blogPost = await BlogPost.findById(blogPostId);

        if (!blogPost)
            return next(new ErrorResponse("No blog post found", 404));

        await blogPost.updateOne({
            isHidden: !blogPost.isHidden
        });
        await blogPost.save();

        res.status(200).json({
            success: true,
            message: `${blogPost.isHidden ? "Unhide" : "Hide"} blog post successfully`
        });
    } catch (error) {
        next(error);
    }
};

// Post Content
exports.addBlogPostContent = async (req, res, next) => {
    const { blogPostId } = req.params;

    if (!blogPostId || !mongoose.Types.ObjectId.isValid(blogPostId)) {
        return next(new ErrorResponse("Please provide valid blog post's ID", 400));
    }

    const { partTitle, partContent } = req.body;

    try {
        const blogPost = await BlogPost.findById(blogPostId);

        if (!blogPost)
            return next(new ErrorResponse("No blog post found", 404));

        const postContent = new PostContent({
            partTitle,
            partContent
        });

        blogPost.blogPostContent.push(postContent);

        await blogPost.save();

        res.status(200).json({
            success: true,
            message: "Add blog post content successfully",
            postContentId: postContent._id
        });
    } catch (error) {
        next(error);
    }
};


// Content Image
exports.addPostContentImage = async (req, res, next) => {
    const { blogPostId } = req.params;

    if (!blogPostId || !mongoose.Types.ObjectId.isValid(blogPostId)) {
        return next(new ErrorResponse("Please provide valid blog post's ID", 400));
    }

    const { postContentId, contentImageDescription } = req.body;

    if (!postContentId || !mongoose.Types.ObjectId.isValid(postContentId)) {
        return next(new ErrorResponse("Please provide valid post content's ID", 400));
    }

    try {
        const blogPost = await BlogPost.findById(blogPostId);

        if (!blogPost)
            return next(new ErrorResponse("No blog post found", 404));
        
        const imageURL = await getDownloadURL(ref(firebaseStorage, `attachments/${req.contentImageOriginalName}`))

        const contentImage = new ContentImage({
            contentImage: imageURL,
            contentImageDescription
        });

        blogPost.blogPostContent.forEach((item, index) => {
            if (item._id == postContentId)
                blogPost.blogPostContent[index].partImage.push(contentImage);
        });

        await blogPost.save();

        res.status(200).json({
            success: true,
            message: "Blog post content's image saved successfully"
        });
    } catch(error) {
        next(error);
    }
};