
  /**
   *  Visualization block view, it encompasses...:
   *
   *  - Visualization list
   *  - Visualization aside (create new vis)
   *  - Visualization empty block
   *
   *  It needs:
   *
   *  - Tables collection
   *  - Visualizations collection
   */

  /*
    TODO list:

      - Order list by created_at / updated_at.
      - Create a new visualization from the scratch.
      - Compress the list.
      - When delete a visualization show the red block.
      - Show loader when load visualizations.
      - Specs.
  */

  cdb.admin.dashboard.Visualizations = cdb.core.View.extend({

    events: {
      'click a.create_new':   '_createNewVis',
      'click aside a.create': '_createNewVis',
      'click .remove':        '_removeTag'
    },

    initialize: function() {

      _.bindAll(this, "_changeTitle");

      this.visualizations = this.options.visualizations;

      this.model = new Backbone.Model({
        show_default_title: true,
        default_title: "Recent visualizations"
      });

      this.model.on("change:show_default_title", this._changeTitle, this);

      /*this.paginator = new cdb.admin.VisualizationPaginator({
        el: this.$("article.visualizations .paginator"),
        tables: this.visualizations
        }); */

      this._initViews();
      this._bindEvents();

    },

    _initViews: function() {
      // Visualizations list
      this.vis_list = new cdb.admin.dashboard.VisualizationsList({
        el:         this.$('#vislist'),
        user:       this.options.user,
        collection: this.visualizations
      });

      this.addView(this.vis_list);
    },

    _bindEvents: function() {
      this.visualizations.bind('add reset', this._setupVisualizationView, this);
      this.visualizations.bind('remove', this._onRemove, this);
    },

    _onRemove: function() {
      this.visualizations.options.set({ type: "derived" });

      this.showLoader();
      this.visualizations.fetch();
    },

    /**
     *  Setup visualization view when collection changes
     */
    _setupVisualizationView: function() {
      this._decideActiveBlock();
      this._changeTitle();
      this.hideLoader();
    },

    showLoader: function() {
      this.$el.find(".loader").show();
    },

    hideLoader: function() {
      this.$el.find(".loader").hide();
    },

    /**
     *  Decide which visualization block active
     */
    _decideActiveBlock: function() {
      var visualizations = _.filter(this.visualizations.models, function(vis) { return vis.get("type") == "derived" }).length;

      if (visualizations > 0) {
        this.$el[ (visualizations > 0) ? 'addClass' : 'removeClass' ]('active');
        this.$el.removeClass("hidden");
      } else {
        this.$el.addClass("hidden");
      }

    },

    _removeTag: function(e) {
      e.preventDefault();
      e.stopPropagation();

      this.trigger("removeTag", this);
    },

    hide: function() {
      this.$el.removeClass("active");
    },

    showDefaultTitle: function(show) {
      this.model.set("show_default_title", show);
    },

    /**
    *  Change visualizations count title
    */
    _changeTitle: function() {

      var title = "";

      if (this.visualizations.options.get("per_page") == this.visualizations._PREVIEW_ITEMS_PER_PAGE) {
        title = this.model.get("default_title");
      }  else {

        var tag   = this.visualizations.options.get("tags");
        var count = this.visualizations.total_entries;

        if (tag) {
          title = count + " visualization" + ( count != 1 ? "s" : "") + " with the tag <a class='remove' href='#'>" + tag + "</a>";
        } else {
          title = count + " visualization" + ( count != 1 ? "s" : "") + " created";
        }

      }

      this.$("h2 span").html(title);

    },

    /**
     *  Open new visualization dialog
     */
    _createNewVis: function(e) {
      this.killEvent(e);

      // Open popup
      var dlg = new cdb.admin.NewVisualizationDialog({
        visualizations: this.visualizations
      });
      dlg.appendToBody().open();
    }
  });
