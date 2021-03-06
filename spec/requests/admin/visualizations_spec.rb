# encoding: utf-8
require 'sequel'
require 'rack/test'
require 'json'
require_relative '../../spec_helper'
require_relative '../../../app/models/visualization/migrator'
require_relative '../../../app/controllers/admin/visualizations_controller'

def app
  CartoDB::Application.new
end #app

describe Admin::VisualizationsController do
  include Rack::Test::Methods
  include Warden::Test::Helpers

  before(:all) do

    @user = create_user(
      username: 'test',
      email:    'test@test.com',
      password: 'test'
    )
    @user.set_map_key
    @api_key = @user.get_map_key
  end

  before(:each) do
    @db = Sequel.sqlite
    Sequel.extension(:pagination)

    CartoDB::Visualization::Migrator.new(@db).migrate
    CartoDB::Visualization.repository  = 
      DataRepository::Backend::Sequel.new(@db, :visualizations)

    delete_user_data @user
    @headers = { 
      'CONTENT_TYPE'  => 'application/json',
      'HTTP_HOST'     => 'test.localhost.lan'
    }
  end

  describe 'GET /viz' do
    it 'returns a list of visualizations' do
      login_as(@user, scope: 'test')

      get "/viz", {}, @headers
      last_response.status.should == 200
    end
  end # GET /viz

  describe 'GET /viz:id' do
    it 'returns a visualization' do
      id = factory.fetch('id')
      login_as(@user, scope: 'test')

      get "/viz/#{id}", {}, @headers
      last_response.status.should == 200
    end
  end # GET /viz/:id

  describe 'GET /viz/:id/public' do
    it 'returns public data for a visualization' do
      table_attributes = table_factory
      id = table_attributes.fetch('id')

      get "/viz/#{id}/public", {}, @headers
      last_response.status.should == 200
    end
  end # GET /viz/:id/public

  describe 'GET /viz/:name/embed_map' do
    it 'renders the view by passing a visualization name' do
      table_attributes = table_factory
      name = table_attributes.fetch('table_visualization').fetch('name')
      name = URI::encode(name)

      login_as(@user, scope: 'test')

      get "/viz/#{name}/embed_map", {}, @headers
      last_response.status.should == 200
    end

    it 'renders embed map error page if visualization private' do
      table_attributes = table_factory
      put "/api/v1/tables/#{table_attributes.fetch('id')}?api_key=#{@api_key}",
        { privacy: 0 }.to_json, @headers

      name = table_attributes.fetch('table_visualization').fetch('name')
      name = URI::encode(name)

      login_as(@user, scope: 'test')

      get "/viz/#{name}/embed_map", {}, @headers
      last_response.status.should == 403
      last_response.body.should =~ /cartodb-embed-error/

      get "/viz/#{name}/embed_map.js", {}, @headers
      last_response.status.should == 403
      last_response.body.should =~ /get_url_params/
    end

    it 'renders embed map error when an exception is raised' do
      login_as(@user, scope: 'test')

      get "/viz/non_existent/embed_map", {}, @headers
      last_response.status.should == 403
      last_response.body.should =~ /cartodb-embed-error/

      get "/viz/non_existent/embed_map.js", {}, @headers
      last_response.status.should == 403
      last_response.body.should =~ /get_url_params/
    end
  end # GET /viz/:name/embed_map

  describe 'GET /viz/:name/track_embed' do
    it 'renders the view by passing a visualization name' do
      name = URI::encode(factory.fetch('name'))
      login_as(@user, scope: 'test')

      get "/viz/track_embed", {}, @headers
      last_response.status.should == 200
    end
  end # GET /viz/:name/track_embed

  def factory
    map     = Map.create(user_id: @user.id)
    payload = {
      name:         "visualization #{rand(9999)}",
      tags:         ['foo', 'bar'],
      map_id:       map.id,
      description:  'bogus',
      type:         'derived'
    }
    post "/api/v1/viz?api_key=#{@api_key}",
      payload.to_json, @headers

    JSON.parse(last_response.body)
  end #factory

  def table_factory
    payload = { name: "table #{rand(9999)}" }
    post "/api/v1/tables?api_key=#{@api_key}",
      payload.to_json, @headers

    table_attributes  = JSON.parse(last_response.body)
    table_id          = table_attributes.fetch('id')
    table_name        = table_attributes.fetch('name')

    put "/api/v1/tables/#{table_id}?api_key=#{@api_key}",
      { privacy: 1 }.to_json, @headers

    sql = URI.escape(%Q{
      INSERT INTO #{table_name} (description)
      VALUES('bogus description')
    })

    get "/api/v1/queries?sql=#{sql}&api_key=#{@api_key}", {}, @headers
    table_attributes
  end #table_factory
end # Admin::VisualizationsController

