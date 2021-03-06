# encoding: utf-8
require_relative '../../spec_helper'
require_relative '../../../services/data-repository/backend/sequel'
require_relative '../../../app/models/visualization/member'
require_relative '../../../app/models/visualization/migrator'
require_relative '../../../services/data-repository/repository'

include CartoDB

describe Visualization::Member do
  before do
    memory = DataRepository.new
    Visualization.repository  = memory
    Overlay.repository        = memory
  end

  describe '#initialize' do
    it 'assigns an id by default' do
      member = Visualization::Member.new
      member.should be_an_instance_of Visualization::Member
      member.id.should_not be_nil
    end
  end #initialize

  describe '#store' do
    it 'persists attributes to the data repository' do
      attributes  = random_attributes
      member      = Visualization::Member.new(attributes)
      member.store

      member = Visualization::Member.new(id: member.id)
      member.name.should be_nil

      member.fetch
      member.name             .should == attributes.fetch(:name)
      member.active_layer_id  .should == attributes.fetch(:active_layer_id)
      member.privacy          .should == attributes.fetch(:privacy)
    end

    it 'persists tags as an array if the backend supports it' do
      db_config   = Rails.configuration.database_configuration[Rails.env]
      db          = Sequel.postgres(
                      host:     db_config.fetch('host'),
                      port:     db_config.fetch('port'),
                      username: db_config.fetch('username')
                    )
      relation    = "visualizations_#{Time.now.to_i}".to_sym
      repository  = DataRepository::Backend::Sequel.new(db, relation)
      Visualization::Migrator.new(db).migrate(relation)
      attributes  = random_attributes(tags: ['tag 1', 'tag 2'])
      member      = Visualization::Member.new(attributes, repository)
      member.store
      
      member      = Visualization::Member.new({ id: member.id }, repository)
      member.fetch
      member.tags.should include('tag 1')
      member.tags.should include('tag 2')

      Visualization::Migrator.new(db).drop(relation)
    end

    it 'persists tags as JSON if the backend does not support arrays' do
      attributes  = random_attributes(tags: ['tag 1', 'tag 2'])
      member      = Visualization::Member.new(attributes)
      member.store

      member = Visualization::Member.new(id: member.id)
      member.fetch
      member.tags.should include('tag 1')
      member.tags.should include('tag 2')
    end
  end #store

  describe '#fetch' do
    it 'fetches attributes from the data repository' do
      attributes  = random_attributes
      member      = Visualization::Member.new(attributes).store
      member      = Visualization::Member.new(id: member.id)
      member.name = 'changed'
      member.fetch
      member.name.should == attributes.fetch(:name)
    end
  end #fetch

  describe '#delete' do
    it 'deletes this member data from the data repository' do
      member = Visualization::Member.new(random_attributes).store
      member.fetch
      member.name.should_not be_nil

      member.delete
      member.name.should be_nil

      lambda { member.fetch }.should raise_error KeyError
    end
  end #delete

  describe '#public?' do
    it 'returns true if privacy set to public' do
      visualization = Visualization::Member.new(privacy: 'public')
      visualization.public?.should == true

      visualization.privacy = 'private'
      visualization.public?.should == false

      visualization.privacy = 'public'
      visualization.public?.should == true
    end
  end #public?

  describe '#authorize?' do
    it 'returns true if user maps include map_id' do
      map_id  = rand(99)
      member  = Visualization::Member.new(name: 'foo', map_id: map_id)

      maps    = [OpenStruct.new(id: map_id)]
      user    = OpenStruct.new(maps: maps)
      member.authorize?(user).should == true

      maps    = [OpenStruct.new(id: 999)]
      user    = OpenStruct.new(maps: maps)
      member.authorize?(user).should == false
    end
  end #authorize?

  describe 'validations' do
    describe '#privacy' do
      it 'must be present' do
        visualization = Visualization::Member.new
        visualization.valid?.should == false
        visualization.errors.fetch(:privacy)
          .map(&:rule).map(&:class)
          .should include Aequitas::Rule::Presence::NotBlank
      end

      it 'must be valid' do
        visualization = Visualization::Member.new(privacy: 'wadus')
        visualization.valid?.should == false
        visualization.errors.fetch(:privacy)
          .map(&:rule).map(&:class)
          .should include Aequitas::Rule::Within
      end
    end # privacy

    describe '#name' do
      it 'must be available for the user (uniqueness)' do
        pending
        visualization =
          Visualization::Member.new({}, Visualization.repository, name_checker)
        visualization.valid?
      end
    end #name
  end # validations

  def random_attributes(attributes={})
    random = rand(999)
    {
      name:         attributes.fetch(:name, "name #{random}"),
      description:  attributes.fetch(:description, "description #{random}"),
      privacy:      attributes.fetch(:privacy, 'public'),
      tags:         attributes.fetch(:tags, ['tag 1']),
      type:         attributes.fetch(:type, 'public'),
      active_layer_id: random
    }
  end #random_attributes
end # Visualization

