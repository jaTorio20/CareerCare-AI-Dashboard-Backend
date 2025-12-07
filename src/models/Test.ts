import mongoose, { Model, Schema } from "mongoose";

interface ITest {
    name: string;
}

// const testSchema = new mongoose.Schema({
const testSchema= new Schema<ITest>({
    name: {
        type: String,
        required: true,
    },   
});

const Test: Model<ITest> = mongoose.model<ITest>('Test', testSchema);

export default Test;