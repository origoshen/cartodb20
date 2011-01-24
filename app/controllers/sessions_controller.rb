# coding: UTF-8

class SessionsController < ApplicationController

  layout 'front_layout'

  def new
    if logged_in?
      redirect_to dashboard_path and return
    end
  end

  def create
    authenticate!
    redirect_to dashboard_path
  end

  def destroy
    logout
    redirect_to root_path
  end

  def unauthenticated
    flash[:alert] = 'Your account or your password is not ok'
    render :action => 'new' and return
  end

end
