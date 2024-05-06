import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// import multer from "../middlewares/multer.middleware.js";



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from front-end
    //validation- not empty
    //check if user alerady exists: username,email
    //check for images,check for avatar
    //upload theam to cloudinary, check avatar
    //create user object - create entry in db
    //remove password and refresh token field response
    //check for user creation
    //return response

    //get user details from front-end
    const { fullName, email, username, password } = req.body
    console.log(password);
    //validation- not empty
    if (

        [fullName, email, username, password].some((field) =>
            field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
        //check if user alerady exists: username,email
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //check for images and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;


    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar file is required")
    // }


    //upload image on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar file is required")
    // }



    //create user object- create entry in db
    // console.log("username:", username);
    // const someValue = "exampleValue";
    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
        // username: someValue

    })
    //remove password ans refresh token

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw ApiError(500, "Something Went Wrong while registring the user")
    }

    //return response


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully"
        )
    )
})
const loginUser = asyncHandler(async (req, res) => {
    //req body ->bring data
    // username or email check if available
    //find the user
    //password check
    //access and refresh token
    //send cookies

    const { email, username, password } = req.body
    console.log(email);
    // console.log(password);

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    console.log(user);
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }, "User logged In Successfully")
    )



})
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, {
        $unset: {
            refreshToken: 1//this remove sthe field from document
        }

    }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, {}, "User logged Out")
    )



})
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = User.findById(decodedToken?._id)
    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }
    if (incomingRefreshToken != user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used")
    }
    const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id)
    const options = {
        httpOnly: true,
        secured: true,
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "Access token refreshed"))

})



const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    // if (!(newPassword === confPassword)) {

    // }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")

    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed succesfully"))
}
)
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current user fetched successfully")
})




const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All field are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }).select("-password")
    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))
})


//updatefiles

const updateUserAvatar = asyncHandler(async (req, res) => {
    // const {avatar} = req.body
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")

    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Error while uploading a avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: avatar.url
        },
        { new: true }
    ).select("-password")
    return res.status(200).json(new ApiResponse(200, user, "Avatar Image updated successfully"))
})



const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage) {
        throw new ApiError(400, "Error whiel uploading a coverImage ")
    }
    const user = User.findByIdAndUpdate(req.file?._id,
        {
            $set: coverImage.url
        },
        { new: true }.select("-password"))
    return res.status(200).json(new ApiResponse(200, user, "Cover Image updated successfully"))

})



const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foriegnField: "channel",
                as: "subscribers"

            }
        }

    ])
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile }