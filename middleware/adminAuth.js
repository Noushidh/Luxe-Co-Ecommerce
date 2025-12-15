
export const checkSession = (req,res,next)=>{
    if(req.session.admin){
        next();
    }else{
        res.redirect('/admin/login')
    }
}
export const isLoggin = (req,res,next)=>{
    if(req.session.admin){
        res.redirect('/admin/dashboard')
    }else{
        next();
    }
}

