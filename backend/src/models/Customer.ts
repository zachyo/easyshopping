import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface CustomerAttributes {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: Date;
}

interface CustomerCreationAttributes extends Optional<
  CustomerAttributes,
  "id" | "created_at"
> {}

class Customer
  extends Model<CustomerAttributes, CustomerCreationAttributes>
  implements CustomerAttributes
{
  public id!: string;
  public user_id!: string;
  public first_name!: string;
  public last_name!: string;
  public phone!: string;
  public created_at!: Date;
}

Customer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "customers",
    timestamps: false,
  },
);

export default Customer;
